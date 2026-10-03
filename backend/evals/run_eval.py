"""Evaluation harness. Expected answers are computed independently with pandas from the sample data.
Run: python backend/evals/run_eval.py   (exit code 1 if any case fails)"""
import sys, pathlib
import pandas as pd
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import engine

ROOT = pathlib.Path(__file__).resolve().parents[2]
df = engine.prep(pd.read_csv(ROOT / "database" / "samples" / "sales_sample.csv"))
top_region = df.groupby("region")["revenue"].sum().idxmax()
top_cust = df.groupby("customer")["revenue"].sum().nlargest(5).index.tolist()
worst_prod = df.groupby("product")["revenue"].sum().idxmin()
CASES = [  # (question, check(result) -> bool, label)
    ("Which region generated the highest revenue?", lambda r: top_region in r["answer"] and r["sql"], "top region + SQL"),
    ("What are the top five customers?", lambda r: all(c in r["answer"] for c in top_cust), "top 5 customers"),
    ("Which products are underperforming?", lambda r: worst_prod in r["answer"], "lowest product"),
    ("Show monthly sales trends.", lambda r: r["chart"] and r["chart"]["type"] == "line", "line chart"),
    ("Detect anomalies in the dataset.", lambda r: "9,800,000" in r["answer"] and "expected range" in r["answer"], "outlier found and explained"),
    ("Run a data quality check", lambda r: "1 missing" in r["answer"], "missing value counted"),
    ("Forecast the next 3 months", lambda r: r["chart"] and r["chart"].get("forecast"), "forecast chart"),
    ("Give me an executive summary", lambda r: "Executive summary" in r["answer"] and "Agent plan" in r["reasoning"], "agent summary"),
    ("abc", lambda r: "columns are" in r["answer"], "gibberish handled"),
]
ok = 0; ctx = {}
for q, check, label in CASES:
    r = engine.analyze(df, "sales_sample", q, ctx)
    if r["ctx"].get("sql"): ctx = r["ctx"]
    passed = bool(check(r)); ok += passed
    print(("PASS" if passed else "FAIL"), "-", label, "|", q)
r = engine.analyze(df, "sales_sample", "Generate SQL for this analysis.", ctx)
passed = bool(r["sql"] and r["sql"] == ctx.get("sql")); ok += passed
print(("PASS" if passed else "FAIL"), "- context follow-up reuses SQL")
total = len(CASES) + 1
print(f"\nScore: {ok}/{total} ({100 * ok // total}%)")
sys.exit(0 if ok == total else 1)
