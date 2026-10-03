import { useState, useEffect, useCallback } from "react";
import { api } from "./lib.js";
export default function Datasets({ term }) {
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState({ text: "", err: false });
  const load = useCallback(() => api("/api/datasets").then(setList).catch((e) => { setList([]); setMsg({ text: e.message, err: true }); }), []);
  useEffect(() => { load(); }, [load]);
  const upload = async (e) => {
    const fd = new FormData(); [...e.target.files].forEach((f) => fd.append("files", f)); e.target.value = "";
    setMsg({ text: "Checking files…", err: false });
    try {
      const r = await api("/api/upload", { method: "POST", body: fd });
      setMsg({ text: `Loaded ${r.datasets.length} file(s).` + (r.errors.length ? " Skipped: " + r.errors.map((x) => `${x.file} (${x.error})`).join("; ") : ""), err: false });
    } catch (x) { setMsg({ text: "Upload failed: " + x.message, err: true }); }
    load();
  };
  const sample = async () => { try { await api("/api/sample", { method: "POST" }); setMsg({ text: "Sample data is ready.", err: false }); load(); } catch (e) { setMsg({ text: e.message, err: true }); } };
  const del = async (n) => { await api("/api/datasets/" + encodeURIComponent(n), { method: "DELETE" }); load(); };
  const shown = (list || []).filter((d) => !term || d.name.toLowerCase().includes(term));
  return (
    <div className="page"><div className="wrap sec">
      <h2>Datasets</h2>
      <p className="lead">Upload one or more CSV files (up to 20 MB each). Files are validated before use.</p>
      <label className="drop" htmlFor="file"><input id="file" type="file" accept=".csv" multiple onChange={upload} /><span>Choose CSV files</span></label>
      <p role="status" className={"note" + (msg.err ? " err" : "")}>{msg.text}</p>
      {list === null ? <p className="note">Loading…</p> : shown.length === 0 ? (
        <div className="center"><p className="note">{term ? `No datasets match “${term}”.` : "No datasets yet. Upload a CSV file or load the sample data."}</p>
          {!term && <button className="btn lg primary" type="button" onClick={sample}>Load sample data</button>}</div>
      ) : (
        <div className="grid">{shown.map((d) => (
          <div className="card" key={d.name}><h3>{d.name}</h3><p>{d.rows} rows, {d.cols} columns<br />{d.columns.join(", ")}</p>
            <span><a className="btn" href="#analytics">Ask questions</a> <button className="btn" type="button" onClick={() => del(d.name)}>Remove</button></span></div>))}</div>)}
    </div></div>
  );
}
