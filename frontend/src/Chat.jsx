import { useState, useEffect, useRef } from "react";
import { api, EX, ss, authHeader } from "./lib.js";
export function ChartView({ c }) {
  const cv = useRef(null);
  useEffect(() => {
    if (!window.Chart || !cv.current) return;
    const pal = ["#12355b", "#2e7d9a", "#c47f17", "#6b8e23", "#8b3a62", "#555", "#a0522d", "#3b6ea5"];
    const o = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: c.title } } };
    let cfg;
    if (c.type === "scatter") cfg = { type: "scatter", data: { datasets: [{ label: c.title, data: c.points, backgroundColor: pal[0] }] }, options: { ...o, scales: { x: { title: { display: true, text: c.xl } }, y: { title: { display: true, text: c.yl } } } } };
    else if (c.type === "pie") cfg = { type: "pie", data: { labels: c.labels, datasets: [{ data: c.values, backgroundColor: pal }] }, options: o };
    else {
      const ds = [{ label: c.title, data: c.values, backgroundColor: pal[0], borderColor: pal[0] }];
      if (c.forecast) ds.push({ label: "Forecast", data: c.forecast, borderColor: pal[2], borderDash: [6, 4] });
      cfg = { type: c.type, data: { labels: c.labels, datasets: ds }, options: o };
    }
    const ch = new window.Chart(cv.current, cfg);
    return () => ch.destroy();
  }, [c]);
  return <div className="chartbox" role="img" aria-label={c.title}><canvas ref={cv} /></div>;
}
function DataTable({ t }) {
  if (!t) return null;
  return (<div style={{ overflowX: "auto" }}><table><thead><tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
    <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{typeof v === "number" ? +v.toFixed(2) : String(v ?? "")}</td>)}</tr>)}</tbody></table></div>);
}
export default function Chat({ hash, consume }) {
  const [ds, setDs] = useState([]);
  const [dataset, setDataset] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState([]);
  const sid = useRef(ss.get("sid"));
  const end = useRef(null);
  const [live, setLive] = useState(null);
  const ctl = useRef(null);
  useEffect(() => { api("/api/datasets").then((d) => { setDs(d); setDataset((x) => x || (d.length ? d[d.length - 1].name : "")); }).catch(() => {}); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);
  async function ask(q) {
    q = q.trim(); if (!q || busy) return;
    setText(""); setBusy(true); setLive({ steps: [], text: "" });
    setMsgs((m) => [...m, { role: "u", text: q }]);
    ctl.current = new AbortController();
    try {
      const res = await fetch("/api/chat/stream", { method: "POST", signal: ctl.current.signal, headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ session_id: sid.current, question: q, dataset: dataset || null }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(typeof j.detail === "string" ? j.detail : "Request failed"); }
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
        for (const ln of lines) {
          if (!ln.trim()) continue; const ev = JSON.parse(ln);
          if (ev.type === "step") setLive((l) => ({ ...l, steps: [...l.steps, ev.text] }));
          else if (ev.type === "token") setLive((l) => ({ ...l, text: l.text + ev.text }));
          else if (ev.type === "error") throw new Error(ev.text);
          else if (ev.type === "final") { const r = ev.data; sid.current = r.session_id; ss.set("sid", r.session_id); setMsgs((m) => [...m, { role: "a", r }]); setSugg((r.suggestions || []).slice(0, 6)); }
        }
      }
    } catch (e) { if (e.name !== "AbortError") setMsgs((m) => [...m, { role: "e", text: e.message === "Failed to fetch" ? "Cannot reach the server. Is the backend running?" : e.message, q }]); }
    setLive(null); setBusy(false);
  }
  useEffect(() => {
    const p = new URLSearchParams(hash.split("?")[1] || "");
    if (p.get("new")) { sid.current = null; ss.set("sid", null); setMsgs([]); setSugg([]); }
    const a = p.get("ask");
    if (p.get("new") || a) consume();
    if (a) ask(a);
  }, [hash]);
  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(text); } };
  return (
    <div className="page"><div className="wrap sec">
      <h2>Analytics Chat</h2>
      <div className="chatbar"><label htmlFor="ds">Dataset</label>
        <select id="ds" value={dataset} onChange={(e) => setDataset(e.target.value)}>{ds.length ? ds.map((d) => <option key={d.name}>{d.name}</option>) : <option value="">No dataset loaded</option>}</select>
        <a className="btn" href="#report">Download report</a> <a className="btn" href="#report?f=md">Markdown</a> <a className="btn" href="#dashboard">Dashboard</a></div>
      <div className="log" aria-live="polite">
        {msgs.length === 0 && (<div className="msg welcome"><h3>Welcome. What would you like to know?</h3>
          <p>Pick a dataset above (or <a href="#datasets">upload one</a>), then type a question or choose an example. I show the SQL, the code and my reasoning with every answer.</p>
          <div className="chips">{EX.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div></div>)}
        {msgs.map((m, i) => m.role === "u" ? <div key={i} className="msg u">{m.text}</div>
          : m.role === "e" ? <div key={i} className="msg"><p className="err">{m.text}</p><button className="btn" type="button" onClick={() => ask(m.q)}>Retry</button> <a href="#datasets">Go to Datasets</a></div>
          : (<div key={i} className="msg"><p>{m.r.answer}</p>{m.r.chart && <ChartView c={m.r.chart} />}<DataTable t={m.r.table} /><p className="note">{m.r.rows_analysed} rows analysed{m.r.cached ? " · served from cache" : ""}{m.r.joined_with ? ` · joined with ${m.r.joined_with}` : ""}</p>
            <details><summary>Why this answer</summary><p>{m.r.reasoning}</p></details>
            {m.r.sql && <details><summary>SQL</summary><pre>{m.r.sql}</pre></details>}
            {m.r.pandas && <details><summary>Pandas</summary><pre>{m.r.pandas}</pre></details>}</div>))}
        {busy && live && (<div className="msg"><p><b>Analysing…</b> <button className="btn" type="button" onClick={() => ctl.current?.abort()}>Stop</button></p><ul>{live.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>{live.text && <p>{live.text}</p>}</div>)}
        <div ref={end} />
      </div>
      <div className="chips">{sugg.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <label className="sr" htmlFor="q">Your question</label>
        <input id="q" type="text" data-gramm="false" value={text} placeholder="Which region generated the highest revenue?" autoComplete="off" onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
        <button className="btn primary" type="submit" disabled={busy}>Ask</button>
      </form>
      <p className="note">Press Enter to send.</p>
    </div></div>
  );
}
