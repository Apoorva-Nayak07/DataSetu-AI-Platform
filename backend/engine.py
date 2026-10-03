"""Analysis engine: intent routing, pandas/SQL generation, anomalies, quality, forecasting.
Deterministic by default; if ANTHROPIC_API_KEY is set, unrecognised questions go to the LLM."""
import json, os, re, urllib.request
import numpy as np
import pandas as pd

NUMS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
PREF = ["revenue", "sales", "amount", "total", "profit", "price", "value", "quantity"]
ASC = {"lowest", "worst", "underperform", "underperforming", "bottom", "least", "weakest", "low"}


def norm(s): return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()
def stem(w): return w[:-1] if w.endswith("s") and len(w) > 3 else w
def q_(c): return '"' + str(c).replace('"', '""') + '"'


def prep(df):
    df = df.copy()
    for c in df.columns:
        if not pd.api.types.is_numeric_dtype(df[c]) and not pd.api.types.is_datetime64_any_dtype(df[c]) and re.search(r"date|time|month|day", str(c), re.I):
            p = pd.to_datetime(df[c], errors="coerce")
            if p.notna().mean() > 0.8: df[c] = p
    return df


def schema(df):
    dt = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]
    num = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and not norm(c).endswith("id")]
    cat = [c for c in df.columns if c not in dt and c not in num and df[c].nunique() <= max(50, len(df) // 2)]
    return num, cat, dt


def match_cols(q, cols):
    qw = {stem(w) for w in norm(q).split()}
    sc = {}
    for c in cols:
        t = [stem(w) for w in norm(c).split() if w not in ("id", "no")] or [stem(w) for w in norm(c).split()]
        s = sum(w in qw for w in t)
        if s: sc[c] = s
    return sorted(sc, key=lambda c: -sc[c])


def pick_measure(q, num):
    m = match_cols(q, num)
    if m: return m[0]
    for p in PREF:
        for c in num:
            if p in norm(c): return c
    return num[0] if num else None


def res(answer, reasoning, sql=None, pandas_code=None, chart=None, table=None, ctx=None):
    return dict(answer=answer, reasoning=reasoning, sql=sql, pandas=pandas_code, chart=chart, table=table, ctx=ctx or {})


def tbl(df, n=15):
    d = df.head(n).copy()
    for c in d.columns:
        if pd.api.types.is_datetime64_any_dtype(d[c]): d[c] = d[c].dt.strftime("%Y-%m-%d")
    d = d.astype(object).where(d.notna(), None)
    return {"columns": [str(c) for c in d.columns], "rows": d.values.tolist()}


def fmt(x): return f"{x:,.2f}".rstrip("0").rstrip(".") if isinstance(x, (int, float, np.number)) else str(x)


def suggestions(df):
    num, cat, dt = schema(df)
    s = ["Give me a summary of this dataset", "Detect anomalies in the dataset", "Run a data quality check"]
    if cat and num: s += [f"Which {cat[0]} has the highest {pick_measure('', num)}?", f"What are the top five {cat[-1]}s?", f"Which {cat[-1]}s are underperforming?"]
    if dt and num: s += ["Show monthly trends", "Forecast the next 3 months"]
    return s


def ranking(df, t, q, ql, words):
    num, cat, _ = schema(df)
    m = pick_measure(q, num)
    dims = [c for c in match_cols(q, cat) if c != m] or cat
    if not (m and dims): return None
    d = dims[0]; asc = bool(words & ASC)
    n = next((NUMS[w] for w in words if w in NUMS), next((int(w) for w in words if w.isdigit()), None))
    g = df.groupby(d)[m].sum().sort_values(ascending=asc)
    top = g.head(n or 10)
    k = n or 1
    best = ", ".join(f"{i} ({fmt(v)})" for i, v in g.head(k).items())
    word = "lowest" if asc else "highest"
    ans = f"By total {m}, the {word} {d}{'s are' if k > 1 else ' is'}: {best}."
    sql = f'SELECT {q_(d)}, SUM({q_(m)}) AS total_{m}\nFROM {q_(t)}\nGROUP BY {q_(d)}\nORDER BY total_{m} {"ASC" if asc else "DESC"}\nLIMIT {n or 10};'
    pd_code = f'df.groupby("{d}")["{m}"].sum().sort_values(ascending={asc}).head({n or 10})'
    return res(ans, f"Grouped rows by '{d}', summed '{m}' for each group, and sorted {'ascending' if asc else 'descending'}. Column choices came from words in your question; '{m}' is the measure.",
               sql, pd_code, {"type": "bar", "title": f"{m} by {d}", "labels": [str(i) for i in top.index], "values": [float(v) for v in top.values]},
               tbl(top.reset_index()), {"sql": sql, "pandas": pd_code})


def trend(df, t, q, forecast=False):
    num, _, dt = schema(df)
    m = pick_measure(q, num)
    if not dt or not m: return res("This dataset has no date column, so I cannot compute a trend.", "Looked for date-typed columns and found none.")
    d = dt[0]
    s = df.dropna(subset=[d]).groupby(df[d].dt.to_period("M"))[m].sum()
    labels = [str(i) for i in s.index]; vals = [float(v) for v in s.values]
    sql = f'SELECT strftime(\'%Y-%m\', {q_(d)}) AS month, SUM({q_(m)}) AS total_{m}\nFROM {q_(t)}\nGROUP BY month\nORDER BY month;'
    pd_code = f'df.groupby(df["{d}"].dt.to_period("M"))["{m}"].sum()'
    peak = s.idxmax()
    if forecast and len(s) >= 3:
        x = np.arange(len(s)); a, b = np.polyfit(x, s.values, 1)
        fut = [float(a * (len(s) + i) + b) for i in range(3)]
        fl = [str(s.index[-1] + i + 1) for i in range(3)]
        return res(f"Linear-trend forecast for {m}: " + ", ".join(f"{l}: {fmt(v)}" for l, v in zip(fl, fut)) + f". The trend is {'upward' if a > 0 else 'downward'} by about {fmt(abs(a))} per month.",
                   "Fitted a straight line (least squares) to monthly totals and extended it 3 months. This is a simple baseline; it ignores seasonality.", sql, pd_code,
                   {"type": "line", "title": f"{m}: history and forecast", "labels": labels + fl, "values": vals + [None] * 3, "forecast": [None] * (len(vals) - 1) + [vals[-1]] + fut},
                   tbl(pd.DataFrame({"month": fl, "forecast": fut})), {"sql": sql, "pandas": pd_code})
    first, last = vals[0], vals[-1]
    ch = (last - first) / first * 100 if first else 0
    return res(f"Monthly {m} ranges from {fmt(min(vals))} to {fmt(max(vals))}, peaking in {peak}. From {labels[0]} to {labels[-1]} it changed by {ch:.1f}%.",
               f"Converted '{d}' to months and summed '{m}' per month.", sql, pd_code,
               {"type": "line", "title": f"Monthly {m}", "labels": labels, "values": vals}, tbl(s.reset_index().astype(str)), {"sql": sql, "pandas": pd_code})


def anomalies(df, t):
    num, _, _ = schema(df)
    rows = []
    for c in num:
        s = df[c].dropna()
        if len(s) < 8: continue
        q1, q3 = s.quantile([.25, .75]); iqr = q3 - q1
        if iqr == 0: continue
        lo, hi = q1 - 3 * iqr, q3 + 3 * iqr
        for i, v in s[(s < lo) | (s > hi)].items():
            rows.append([c, int(i), float(v), f"{fmt(lo)} to {fmt(hi)}", "above" if v > hi else "below"])
    if not rows: return res("No anomalies found: every numeric value sits inside the normal range.", "Applied the IQR rule (3 x IQR beyond Q1/Q3) to every numeric column.")
    rows.sort(key=lambda r: -abs(r[2]))
    top = rows[0]
    sql = "-- Most extreme values in the flagged column\n" + f'SELECT * FROM {q_(t)} ORDER BY {q_(top[0])} DESC LIMIT 5;'
    pd_code = 'q1,q3 = df[col].quantile([.25,.75]); iqr = q3-q1\ndf[(df[col] < q1-3*iqr) | (df[col] > q3+3*iqr)]'
    return res(f"I flagged {len(rows)} unusual values. The most extreme is {top[0]} = {fmt(top[2])} in row {top[1]}, which is {top[4]} the expected range ({top[3]}).",
               "A value is flagged when it lies more than 3 times the interquartile range beyond the 25th/75th percentile. This is a statistical flag, not proof of error; check the source records.",
               sql, pd_code, None, {"columns": ["column", "row", "value", "expected range", "direction"], "rows": rows[:15]}, {"sql": sql, "pandas": pd_code})


def quality(df, t):
    miss = df.isna().sum(); dup = int(df.duplicated().sum())
    bad = miss[miss > 0]
    score = max(0, 100 - round(100 * (miss.sum() / df.size) * 2 + 100 * dup / max(len(df), 1)))
    ans = f"Data health score: {score}/100. {len(df)} rows, {len(df.columns)} columns, {dup} duplicate rows, {int(miss.sum())} missing cells" + (f" (in {', '.join(map(str, bad.index))})." if len(bad) else ".")
    tb = pd.DataFrame({"column": df.columns, "type": [str(x) for x in df.dtypes], "missing": miss.values, "unique": [df[c].nunique() for c in df.columns]})
    sql = f'SELECT COUNT(*) - COUNT({q_(df.columns[0])}) AS missing_in_first_col FROM {q_(t)};'
    return res(ans, "Counted missing cells and exact duplicate rows, then scored: 100 minus penalties for missing share and duplicate share.", sql, "df.isna().sum(); df.duplicated().sum()", None, tbl(tb))


def summary(df, t):
    num, cat, dt = schema(df)
    parts = [f"{t} has {len(df)} rows and {len(df.columns)} columns."]
    for c in num[:3]: parts.append(f"{c}: total {fmt(df[c].sum())}, average {fmt(df[c].mean())}.")
    for c in cat[:2]:
        v = df[c].value_counts()
        if len(v): parts.append(f"Most common {c}: {v.index[0]} ({v.iloc[0]} rows).")
    if dt: parts.append(f"{dt[0]} spans {df[dt[0]].min():%Y-%m-%d} to {df[dt[0]].max():%Y-%m-%d}.")
    return res(" ".join(parts), "Computed row/column counts, totals and averages of numeric columns, and most frequent categories.", f"SELECT COUNT(*) FROM {q_(t)};", "df.describe(include='all')", None, tbl(df.describe(include="all").T.reset_index().astype(str), 20))


def scatter(df, t, q):
    num, _, _ = schema(df)
    cols = match_cols(q, num)
    cols = (cols + [c for c in num if c not in cols])[:2]
    if len(cols) < 2: return res("I need two numeric columns for a scatter plot.", "Fewer than two numeric columns found.")
    a, b = cols; r = df[a].corr(df[b]); d = df[[a, b]].dropna().head(400)
    return res(f"Correlation between {a} and {b} is {r:.2f} ({'strong' if abs(r) > .7 else 'moderate' if abs(r) > .4 else 'weak'}).",
               "Computed Pearson correlation and plotted up to 400 points.", f'SELECT {q_(a)}, {q_(b)} FROM {q_(t)};', f'df["{a}"].corr(df["{b}"])',
               {"type": "scatter", "title": f"{a} vs {b}", "points": [{"x": float(x), "y": float(y)} for x, y in d.values], "xl": a, "yl": b})


def share(df, t, q):
    num, cat, _ = schema(df); m = pick_measure(q, num); dims = match_cols(q, cat) or cat
    if not (m and dims): return None
    g = df.groupby(dims[0])[m].sum().sort_values(ascending=False).head(8)
    return res(f"{g.index[0]} contributes the largest share of {m}: {g.iloc[0] / g.sum() * 100:.1f}%.", f"Summed '{m}' per '{dims[0]}' and expressed each as a share.",
               f'SELECT {q_(dims[0])}, SUM({q_(m)}) FROM {q_(t)} GROUP BY 1;', f'df.groupby("{dims[0]}")["{m}"].sum()',
               {"type": "pie", "title": f"{m} share by {dims[0]}", "labels": [str(i) for i in g.index], "values": [float(v) for v in g.values]}, tbl(g.reset_index()))


def agent(df, t, q=""):
    """Tool-calling agent: plans which analysis tools to run, runs them, then composes an executive summary."""
    num, cat, dt = schema(df)
    plan = ["quality", "anomalies"] + (["ranking"] if num and cat else []) + (["trend"] if num and dt else [])
    tools = {"quality": lambda: quality(df, t), "anomalies": lambda: anomalies(df, t), "ranking": lambda: ranking(df, t, "", "", set()), "trend": lambda: trend(df, t, "")}
    rs, steps = [], []
    for name in plan:
        r = tools[name]()
        if r: rs.append(r); steps.append(f"Tool '{name}' -> {r['answer'][:110]}")
    miss = int(df.isna().sum().sum()); acts = []
    if miss: acts.append(f"fix or fill the {miss} missing cells")
    if any("flagged" in r["answer"] for r in rs): acts.append("review the flagged unusual values against source records")
    acts.append("verify key figures before sharing")
    chart = next((r["chart"] for r in reversed(rs) if r["chart"]), None)
    sqls = "\n\n".join(r["sql"] for r in rs if r["sql"]); pds = "\n".join(r["pandas"] for r in rs if r["pandas"])
    return res("Executive summary. " + " ".join(r["answer"] for r in rs) + " Recommended actions: " + "; ".join(acts) + ".",
               "Agent plan: " + " -> ".join(plan) + ". Each tool ran on your data and its result is quoted unchanged.\n" + "\n".join(steps),
               sqls, pds, chart, next((r["table"] for r in rs if r["table"]), None), {"sql": sqls, "pandas": pds})


def llm(df, t, q, history):
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key: return None
    ctx = f"Table {t}. Columns: {list(df.columns)}. Sample:\n{df.head(5).to_string()}\nStats:\n{df.describe().to_string()[:1500]}"
    msgs = [{"role": h["role"], "content": h["content"]} for h in history[-6:]] + [{"role": "user", "content": q}]
    body = json.dumps({"model": os.getenv("LLM_MODEL", "claude-sonnet-4-5"), "max_tokens": 600, "system": "You are a careful data analyst. Answer only from the supplied dataset context; say so if the question cannot be answered. Be concise.\n" + ctx, "messages": msgs}).encode()
    try:
        r = urllib.request.Request("https://api.anthropic.com/v1/messages", body, {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
        return json.load(urllib.request.urlopen(r, timeout=30))["content"][0]["text"]
    except Exception:
        return None


def analyze(df, t, q, ctx, history=()):
    q = (q or "").strip(); ql = norm(q); words = set(ql.split()); sw = {stem(w) for w in words}
    if not ql: return res("Please type a question about your data.", "Empty input.")
    if words & {"sql", "pandas", "code", "query"}:
        if ctx.get("sql"): return res("Here is the code for the previous analysis.", "Reused the SQL and pandas generated for your last question.", ctx["sql"], ctx["pandas"], ctx=ctx)
        return res("Ask an analysis question first (for example “Which region has the highest revenue?”), then ask for the SQL.", "No previous analysis in this session.")
    if sw & {"executive", "comprehensive"} or "full analysis" in ql or "business insights" in ql: return agent(df, t, q)
    if sw & {"anomaly", "anomalie", "outlier", "unusual", "suspicious"}: return anomalies(df, t)
    if sw & {"quality", "health", "missing", "duplicate", "clean", "null"}: return quality(df, t)
    if sw & {"forecast", "predict", "future", "projection"}: return trend(df, t, q, True)
    if sw & {"trend", "monthly", "month", "time", "growth"}: return trend(df, t, q)
    if sw & {"scatter", "correlation", "correlate", "relationship"}: return scatter(df, t, q)
    if sw & {"pie", "share", "breakdown", "proportion", "distribution"}:
        r = share(df, t, q)
        if r: return r
    if sw & {"top", "best", "highest", "most", "lowest", "worst", "underperform", "underperforming", "bottom", "least", "which", "rank", "biggest"}:
        r = ranking(df, t, q, ql, words)
        if r: return r
    if sw & {"summary", "summarize", "summarise", "insight", "overview", "describe", "about"}: return summary(df, t)
    txt = llm(df, t, q, history)
    if txt: return res(txt, "Answered by the language model using the dataset schema, sample rows and statistics.")
    cols = ", ".join(map(str, df.columns))
    return res(f"I could not map “{q}” to an analysis of {t}. Its columns are: {cols}. Try one of the suggested questions below, or mention a column name.",
               "No known intent (ranking, trend, anomaly, quality, summary, correlation, share, forecast) matched and no LLM key is configured.")
