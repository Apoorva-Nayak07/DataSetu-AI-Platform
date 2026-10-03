import { useState, useEffect } from "react";
import { api } from "./lib.js";
import { ChartView } from "./Chat.jsx";
export default function Dashboard() {
  const [ds, setDs] = useState([]);
  const [name, setName] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/datasets").then((d) => { setDs(d); if (d.length) setName(d[d.length - 1].name); }).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { if (!name) return; setData(null); setErr(""); api("/api/dashboard/" + encodeURIComponent(name)).then(setData).catch((e) => setErr(e.message)); }, [name]);
  return (
    <div className="page"><div className="wrap sec">
      <h2>Dashboard</h2>
      <p className="lead">Generated automatically from the columns of your dataset.</p>
      <div className="chatbar"><label htmlFor="dsd">Dataset</label>
        <select id="dsd" value={name} onChange={(e) => setName(e.target.value)}>{ds.map((d) => <option key={d.name}>{d.name}</option>)}</select>
        <button className="btn" type="button" onClick={() => window.print()}>Print / save as PDF</button></div>
      {err && <p className="err">{err} <a href="#datasets">Go to Datasets</a></p>}
      {!ds.length && !err && <p className="note">No datasets yet. <a href="#datasets">Upload a CSV file or load the sample data.</a></p>}
      {data && (<>
        <div className="grid">{data.kpis.map((k) => (<div className="card" key={k.label}><p>{k.label}</p><h3>{k.value}</h3></div>))}</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(20rem,1fr))" }}>{data.charts.map((c, i) => (<div className="card" key={i}><ChartView c={c} /></div>))}</div>
      </>)}
    </div></div>
  );
}
