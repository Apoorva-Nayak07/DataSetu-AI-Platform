import os, sys, tempfile
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.db")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
import main

c = TestClient(main.app)


def test_sample_loads_once():
    c.post("/api/sample"); c.post("/api/sample")
    assert len(c.get("/api/datasets").json()) == 1


def test_gibberish_gets_helpful_reply():
    r = c.post("/api/chat", json={"question": "abc"}).json()
    assert "columns are" in r["answer"] and r["suggestions"]


def test_ranking_sql_and_context():
    r = c.post("/api/chat", json={"question": "Which region generated the highest revenue?"}).json()
    assert "region" in r["answer"] and r["sql"] and r["chart"]["type"] == "bar"
    r2 = c.post("/api/chat", json={"question": "Generate SQL for this analysis.", "session_id": r["session_id"]}).json()
    assert r2["sql"] == r["sql"]


def test_anomalies_trend_quality():
    assert "unusual" in c.post("/api/chat", json={"question": "Detect anomalies"}).json()["answer"]
    assert c.post("/api/chat", json={"question": "Show monthly sales trends"}).json()["chart"]["type"] == "line"
    assert "health score" in c.post("/api/chat", json={"question": "data quality"}).json()["answer"]


def test_bad_upload():
    r = c.post("/api/upload", files=[("files", ("x.txt", b"hi", "text/plain"))])
    assert r.status_code == 400


def test_join_dashboard_search_metrics_cache():
    c.post("/api/sample")
    r = c.post("/api/chat", json={"question": "Which city generated the highest revenue?"}).json()
    assert r["joined_with"] == "customers_sample" and "city" in r["answer"]
    a = c.post("/api/chat", json={"question": "Which region generated the highest revenue?"}).json()
    b = c.post("/api/chat", json={"question": "Which region generated the highest revenue?"}).json()
    assert b["cached"] and not a["cached"]
    assert len(c.get("/api/dashboard/sales_sample").json()["charts"]) >= 4
    assert c.get("/api/search", params={"q": "customer"}).json()
    assert c.get("/api/metrics").json()["requests"] > 0


def test_auth_and_stream():
    g = c.post("/api/auth/guest").json()
    assert g["token"] and c.post("/api/auth/register", json={"username": "ab", "password": "x"}).status_code == 400
    u = c.post("/api/auth/register", json={"username": "asha_k", "password": "longpassword"}).json()
    assert c.post("/api/auth/login", json={"username": "asha_k", "password": "wrong-pass"}).status_code == 400
    lines = c.post("/api/chat/stream", json={"question": "Detect anomalies"}, headers={"Authorization": "Bearer " + u["token"]}).text.strip().splitlines()
    assert '"type": "final"' in lines[-1]
    assert c.get("/api/history", headers={"Authorization": "Bearer " + u["token"]}).json()
