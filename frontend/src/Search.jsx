import { useState, useEffect } from "react";
import { api } from "./lib.js";
export default function Search({ q }) {
  const [res, setRes] = useState(null);
  useEffect(() => { setRes(null); api("/api/search?q=" + encodeURIComponent(q)).then(setRes).catch(() => setRes([])); }, [q]);
  return (
    <div className="page"><div className="wrap sec">
      <h2>Search results</h2>
      <p className="lead">Datasets, column values and past questions matching “{q}”.</p>
      {res === null ? <p className="note">Searching…</p> : res.length === 0 ? <p className="note">Nothing found. Try a column name or a word from an earlier question.</p> : (
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>{res.map((r, i) => (
          <a className="card" key={i} href={r.link}><h3>{r.title}</h3><p>{r.snippet}</p><span className="go">{r.kind} →</span></a>))}</div>)}
    </div></div>
  );
}
