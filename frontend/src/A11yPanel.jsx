import { useEffect, useRef } from "react";
const GROUPS = [["Color Contrast",[["hc","High Contrast","◐"],["normal","Normal Contrast","○"],["links","Highlight Links","🔗"],["inv","Invert","◑"],["sat","Saturation","🎨"]]],
["Text Size",[["inc","Font Size Increase","A+"],["dec","Font Size Decrease","A−"],["nrm","Normal Font","A"],["sp","Text Spacing","↔"],["lh","Line Height","↕"]]],
["Others",[["noimg","Hide Images","🖼"],["big","Big Cursor","⬉"]]]];
export default function A11yPanel({ a11y, setA11y, onClose }) {
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    box.current.querySelector("button").focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = [...box.current.querySelectorAll("button")], i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev && prev.focus && prev.focus(); };
  }, []);
  const fs = a11y.fs || 100;
  const press = (k) => setA11y((a) => {
    const n = { ...a };
    if (k === "inc") n.fs = Math.min(150, fs + 10);
    else if (k === "dec") n.fs = Math.max(85, fs - 5);
    else if (k === "nrm") delete n.fs;
    else if (k === "normal") { n.hc = false; n.inv = false; }
    else n[k] = !n[k];
    return n;
  });
  const on = (k) => k === "normal" ? !a11y.hc : k === "nrm" ? fs === 100 : k === "inc" || k === "dec" ? false : !!a11y[k];
  return (
    <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="a11yT" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlgbox" ref={box}>
        <h2 id="a11yT" className="center">Accessibility Tools</h2>
        {GROUPS.map(([g, tiles]) => (<div key={g}><h3>{g}</h3><div className="tiles">
          {tiles.map(([k, label, icon]) => (<button key={k} type="button" className="tile2" aria-pressed={on(k)} onClick={() => press(k)}><span aria-hidden="true">{icon}</span>{label}</button>))}
        </div></div>))}
        <div className="center"><button className="btn" type="button" onClick={() => setA11y({})}>Reset all</button> <button className="btn primary" type="button" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
