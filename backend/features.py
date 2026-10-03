"""Bonus features: cache, multi-file joins, dashboard generation, TF-IDF search."""
import hashlib, math, collections
import pandas as pd
import engine


class Cache:
    def __init__(self, size=200): self.d, self.size, self.hits, self.misses = collections.OrderedDict(), size, 0, 0
    def get(self, k):
        if k in self.d: self.d.move_to_end(k); self.hits += 1; return self.d[k]
        self.misses += 1
    def put(self, k, v):
        self.d[k] = v; self.d.move_to_end(k)
        while len(self.d) > self.size: self.d.popitem(last=False)


def fingerprint(df):
    return hashlib.md5(pd.util.hash_pandas_object(df.astype(str), index=False).values.tobytes()).hexdigest()[:12]


def find_join(frames, cur, q):
    """If the question mentions columns that live in another file sharing a key column, join them."""
    df = frames[cur]
    for o, odf in frames.items():
        if o == cur: continue
        shared = [c for c in df.columns if c in odf.columns]
        extra = [c for c in engine.match_cols(q, [c for c in odf.columns if c not in df.columns])]
        if shared and extra:
            key = next((c for c in shared if df[c].dtype == object), shared[0])
            return f"{cur}__{o}", df.merge(odf.drop_duplicates(key), on=key, how="left", suffixes=("", "_" + o)), key, o
    return None


def dashboard(df, t):
    num, cat, dt = engine.schema(df)
    kpis = [{"label": "Rows", "value": f"{len(df):,}"}, {"label": "Columns", "value": str(len(df.columns))}]
    kpis += [{"label": f"Total {c}", "value": engine.fmt(df[c].sum())} for c in num[:3]]
    if dt: kpis.append({"label": "Period", "value": f"{df[dt[0]].min():%Y-%m} to {df[dt[0]].max():%Y-%m}"})
    charts = []
    for q in [""] + ([cat[1]] if len(cat) > 1 else []):
        r = engine.ranking(df, t, q, "", set())
        if r and r["chart"]: charts.append(r["chart"])
    if dt and num:
        r = engine.trend(df, t, "")
        if r["chart"]: charts.append(r["chart"])
    r = engine.share(df, t, "")
    if r and r["chart"]: charts.append(r["chart"])
    if len(num) >= 2: charts.append(engine.scatter(df, t, "")["chart"])
    return {"dataset": t, "kpis": kpis, "charts": charts}


def _tok(s): return [engine.stem(w) for w in engine.norm(s).split()]


def search(frames, messages, q, limit=10):
    docs = []
    for n, df in frames.items():
        docs.append(("dataset", n, f"{n} {' '.join(map(str, df.columns))}", "#datasets"))
        _, cat, _ = engine.schema(df)
        for c in cat: docs.append(("column values", f"{n} · {c}", f"{c} {' '.join(map(str, df[c].dropna().unique()[:60]))}", f"#analytics?ask={c}"))
    for m in messages: docs.append(("conversation", m[:90], m, "#analytics"))
    toks = [_tok(d[2]) for d in docs]
    df_ = collections.Counter(w for t in toks for w in set(t))
    N = len(docs) or 1
    qt = _tok(q); out = []
    for d, t in zip(docs, toks):
        if not t: continue
        tf = collections.Counter(t)
        s = sum((1 + math.log(tf[w])) * math.log(1 + N / df_[w]) for w in qt if w in tf) / math.sqrt(len(t))
        if s > 0: out.append((s, d))
    out.sort(key=lambda x: -x[0])
    return [{"kind": d[0], "title": d[1], "snippet": d[2][:140], "link": d[3], "score": round(s, 3)} for s, d in out[:limit]]
