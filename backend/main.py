import io, json, logging, os, re, sqlite3, time, uuid
from html import escape
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import auth, engine, features

ROOT = Path(__file__).resolve().parent.parent
DB = Path(os.getenv("DB_PATH", ROOT / "database" / "app.db"))
MAX_MB = 20
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("datasetu")
app = FastAPI(title="DataSetu API")
FRAMES: dict[str, pd.DataFrame] = {}
FP: dict[str, str] = {}
SESSIONS: dict[str, dict] = {}
CACHE = features.Cache(200)


def conn(): return sqlite3.connect(DB)


def init():
    DB.parent.mkdir(parents=True, exist_ok=True)
    c = conn(); c.executescript((ROOT / "database" / "schema.sql").read_text())
    try: c.execute("ALTER TABLE messages ADD COLUMN user TEXT")
    except sqlite3.OperationalError: pass
    for (n,) in c.execute("SELECT name FROM datasets").fetchall():
        FRAMES[n] = engine.prep(pd.read_sql(f'SELECT * FROM "{n}"', c)); FP[n] = features.fingerprint(FRAMES[n])
    c.commit(); c.close()


init()


@app.middleware("http")  # observability: request id, latency, DB log
async def observe(request: Request, call_next):
    t0, rid, status = time.perf_counter(), uuid.uuid4().hex[:8], 500
    try:
        resp = await call_next(request); status = resp.status_code
    finally:
        ms = (time.perf_counter() - t0) * 1000
        if request.url.path.startswith("/api/"):
            log.info("%s %s %s -> %s in %.0fms", rid, request.method, request.url.path, status, ms)
            try:
                c = conn(); c.execute("INSERT INTO request_log(method, path, status, ms) VALUES (?,?,?,?)", (request.method, request.url.path, status, ms)); c.commit(); c.close()
            except Exception: pass
    resp.headers["X-Request-ID"] = rid
    return resp


def user_of(authorization):
    if not authorization or not authorization.startswith("Bearer "): return None
    c = conn(); u = auth.user_for(c, authorization[7:]); c.close(); return u


def store(name, raw_name, df):
    c = conn(); df.to_sql(name, c, if_exists="replace", index=False)
    c.execute("INSERT OR REPLACE INTO datasets(name, filename, rows, cols) VALUES (?,?,?,?)", (name, raw_name, len(df), len(df.columns))); c.commit(); c.close()
    FRAMES[name] = engine.prep(df); FP[name] = features.fingerprint(FRAMES[name])


def info(n):
    df = FRAMES[n]; return {"name": n, "rows": len(df), "cols": len(df.columns), "columns": [str(c) for c in df.columns]}


@app.get("/api/health")
def health(): return {"status": "ok", "datasets": len(FRAMES)}


@app.get("/api/metrics")
def metrics():
    c = conn(); rows = c.execute("SELECT ms, status FROM request_log").fetchall(); c.close()
    ms = sorted(r[0] for r in rows)
    return {"requests": len(rows), "errors": sum(r[1] >= 500 for r in rows), "avg_ms": round(sum(ms) / len(ms), 1) if ms else 0,
            "p95_ms": round(ms[int(len(ms) * .95) - 1], 1) if ms else 0, "cache": {"hits": CACHE.hits, "misses": CACHE.misses, "size": len(CACHE.d)}, "datasets": len(FRAMES)}


class Cred(BaseModel):
    username: str = ""
    password: str = ""


def _auth(fn, *a):
    c = conn()
    try: return fn(c, *a)
    except ValueError as e: raise HTTPException(400, str(e))
    finally: c.close()


@app.post("/api/auth/register")
def register(b: Cred): return _auth(auth.register, b.username, b.password)


@app.post("/api/auth/login")
def login(b: Cred): return _auth(auth.login, b.username, b.password)


@app.post("/api/auth/guest")
def guest(): return _auth(auth.guest)


@app.get("/api/history")
def history(authorization: str | None = Header(None)):
    u = user_of(authorization)
    if not u: raise HTTPException(401, "Log in to see your history.")
    c = conn(); rows = c.execute("SELECT session_id, role, content, created_at FROM messages WHERE user=? ORDER BY id DESC LIMIT 100", (u,)).fetchall(); c.close()
    return [dict(session_id=r[0], role=r[1], content=r[2], at=r[3]) for r in rows]


@app.get("/api/datasets")
def datasets(): return [info(n) for n in FRAMES]


@app.post("/api/upload")
async def upload(files: list[UploadFile] = File(...)):
    out, errors = [], []
    for f in files:
        fn = f.filename or "file"
        try:
            if not fn.lower().endswith(".csv"): raise ValueError("Only .csv files are accepted.")
            data = await f.read()
            if not data: raise ValueError("The file is empty.")
            if len(data) > MAX_MB * 1024 * 1024: raise ValueError(f"File exceeds {MAX_MB} MB.")
            try: df = pd.read_csv(io.BytesIO(data), sep=None, engine="python")  # auto-detects , ; tab
            except UnicodeDecodeError: df = pd.read_csv(io.BytesIO(data), sep=None, engine="python", encoding="latin-1")
            if df.empty: raise ValueError("No rows found.")
            if df.columns.duplicated().any(): raise ValueError("Duplicate column names found.")
            name = re.sub(r"\W+", "_", Path(fn).stem).strip("_").lower() or "dataset"
            store(name, fn, df); out.append(info(name))
        except Exception as e:
            errors.append({"file": fn, "error": str(e) if isinstance(e, ValueError) else "Could not read this file as CSV."})
    if not out and errors: raise HTTPException(400, errors)
    return {"datasets": out, "errors": errors}


@app.post("/api/sample")
def sample():
    for n in ("sales_sample", "customers_sample"):  # idempotent: loaded once
        if n not in FRAMES: store(n, n + ".csv", pd.read_csv(ROOT / "database" / "samples" / f"{n}.csv"))
    return info("sales_sample")


@app.delete("/api/datasets/{name}")
def delete(name: str):
    if name not in FRAMES: raise HTTPException(404, "Dataset not found")
    c = conn(); c.execute(f'DROP TABLE IF EXISTS "{name}"'); c.execute("DELETE FROM datasets WHERE name=?", (name,)); c.commit(); c.close()
    FRAMES.pop(name); FP.pop(name, None); return {"deleted": name}


@app.get("/api/dashboard/{name}")
def dashboard(name: str):
    if name not in FRAMES: raise HTTPException(404, "Dataset not found")
    return features.dashboard(FRAMES[name], name)


@app.get("/api/search")
def search(q: str = ""):
    c = conn(); msgs = [r[0] for r in c.execute("SELECT content FROM messages WHERE role='user' ORDER BY id DESC LIMIT 300")]; c.close()
    return features.search(FRAMES, msgs, q) if q.strip() else []


class Chat(BaseModel):
    session_id: str | None = None
    question: str
    dataset: str | None = None


def run_chat(b: Chat, user):
    if not FRAMES: raise HTTPException(400, "Upload a CSV file or load the sample data first.")
    sid = b.session_id or uuid.uuid4().hex
    s = SESSIONS.setdefault(sid, {"history": [], "ctx": {}, "dataset": None, "log": []})
    ql = engine.norm(b.question)
    name = next((n for n in FRAMES if engine.norm(n) in ql), None) or b.dataset or s["dataset"] or list(FRAMES)[-1]
    if name not in FRAMES: raise HTTPException(404, "Dataset not found")
    s["dataset"] = name
    df, table, fp, joined = FRAMES[name], name, FP[name], None
    j = features.find_join(FRAMES, name, b.question)  # multi-file analysis
    if j:
        table, df, key, joined = j
        c = conn(); df.to_sql(table, c, if_exists="replace", index=False); c.commit(); c.close()
        fp = features.fingerprint(df)
    code_req = bool(set(ql.split()) & {"sql", "pandas", "code", "query"})
    key = (fp, table, ql)
    r = None if code_req else CACHE.get(key)
    cached = r is not None
    if r is None:
        try: r = engine.analyze(df, table, b.question, s["ctx"], s["history"])
        except Exception as e:
            log.exception("analysis failed"); r = engine.res("I hit an error while analysing that question. Try rephrasing it or naming a column.", f"Internal error: {type(e).__name__}")
        if not code_req: CACHE.put(key, dict(r))
    r = dict(r)
    if r["ctx"].get("sql"): s["ctx"] = r["ctx"]
    r.pop("ctx", None)
    s["history"] += [{"role": "user", "content": b.question}, {"role": "assistant", "content": r["answer"]}]
    s["log"].append({"q": b.question, "answer": r["answer"], "sql": r.get("sql"), "dataset": table})
    c = conn(); c.executemany("INSERT INTO messages(session_id, role, content, user) VALUES (?,?,?,?)", [(sid, "user", b.question, user), (sid, "assistant", r["answer"], user)]); c.commit(); c.close()
    return {**r, "session_id": sid, "dataset": table, "rows_analysed": len(df), "cached": cached, "joined_with": joined, "suggestions": engine.suggestions(FRAMES[name])}


@app.post("/api/chat")
def chat(b: Chat, authorization: str | None = Header(None)): return run_chat(b, user_of(authorization))


@app.post("/api/chat/stream")  # streaming: progress steps, then the answer word-by-word, then the full payload
def chat_stream(b: Chat, authorization: str | None = Header(None)):
    user = user_of(authorization)
    L = lambda o: json.dumps(o, default=str) + "\n"

    def gen():
        yield L({"type": "step", "text": "Reading the dataset schema…"})
        yield L({"type": "step", "text": "Choosing the analysis…"})
        try: r = run_chat(b, user)
        except HTTPException as e: yield L({"type": "error", "text": str(e.detail)}); return
        yield L({"type": "step", "text": f"Analysed {r['rows_analysed']} rows" + (" (from cache)" if r["cached"] else "")})
        w = r["answer"].split(" ")
        for i in range(0, len(w), 3): yield L({"type": "token", "text": " ".join(w[i:i + 3]) + " "}); time.sleep(0.015)
        yield L({"type": "final", "data": r})
    return StreamingResponse(gen(), media_type="application/x-ndjson")


def _log(sid):
    lg = SESSIONS.get(sid, {}).get("log")
    if not lg: raise HTTPException(404, "No conversation found")
    return lg


@app.get("/api/report/{sid}", response_class=HTMLResponse)
def report(sid: str):
    body = "".join(f"<h3>Q{i}. {escape(e['q'])}</h3><p>{escape(e['answer'])}</p>" + (f"<pre>{escape(e['sql'])}</pre>" if e["sql"] else "") for i, e in enumerate(_log(sid), 1))
    return f"<!doctype html><meta charset=utf-8><title>DataSetu report</title><body style='font:16px/1.6 Georgia;max-width:760px;margin:2rem auto'><h1>DataSetu analysis report</h1>{body}<hr><small>AI-generated analysis may contain errors. Verify important figures. Print this page to save as PDF.</small>"


@app.get("/api/report-md/{sid}", response_class=PlainTextResponse)
def report_md(sid: str):
    out = "# DataSetu analysis report\n\n"
    for i, e in enumerate(_log(sid), 1): out += f"## Q{i}. {e['q']}\n\n{e['answer']}\n\n" + (f"```sql\n{e['sql']}\n```\n\n" if e["sql"] else "")
    return PlainTextResponse(out + "_AI-generated analysis may contain errors. Verify important figures._\n", headers={"Content-Disposition": "attachment; filename=report.md"})


DIST = ROOT / "frontend" / "dist"  # built React app (npm run build)
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
