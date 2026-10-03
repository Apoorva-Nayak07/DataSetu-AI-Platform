import { useState, useEffect, useRef } from "react";
import { NAV, LN } from "./lib.js";
export default function Header({ t, lang, setLang, theme, setTheme, openA11y, setTerm, path, user, logout }) {
  const [open, setOpen] = useState(null);
  const [lm, setLm] = useState(false);
  const [mob, setMob] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const click = (e) => { if (!ref.current?.contains(e.target)) { setOpen(null); setLm(false); } };
    const key = (e) => {
      if (e.key === "Escape") { setOpen(null); setLm(false); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); document.getElementById("gs")?.focus(); }
    };
    document.addEventListener("click", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("click", click); document.removeEventListener("keydown", key); };
  }, []);
  const arrows = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...e.currentTarget.querySelectorAll("a[role=menuitem]")];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? items[i + 1] || items[0] : items[i - 1] || items[items.length - 1];
    next.focus();
  };
  const submit = (e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q").toString().trim(); setTerm(q.toLowerCase()); location.hash = "#search?q=" + encodeURIComponent(q); };
  return (
    <div ref={ref}>
      <div className="strip"><div className="wrap row">
        <span className="tl"><svg width="18" height="18" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="4" fill="currentColor" /></svg> <span>{t("tagline")}</span></span>
        <span className="tools">
          <a className="ib" href="#main" title="Skip to main content" aria-label="Skip to main content">↧</a>
          <button className="ib" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
          <span className="pop">
            <button className="ib" type="button" aria-label="Language" title="Language" aria-haspopup="menu" aria-expanded={lm} onClick={() => { setLm(!lm); setOpen(null); }}>🌐</button>
            {lm && <ul className="menu right" role="menu">{Object.keys(LN).map((k) => (
              <li role="none" key={k}><button role="menuitem" lang={k} onClick={() => { setLang(k); setLm(false); }}>{k === lang ? "✓ " : "\u00a0\u00a0\u00a0"}{LN[k]}</button></li>))}</ul>}
          </span>
          {user ? <button className="ib" type="button" onClick={logout} title="Log out">{user} · Logout</button> : <a className="ib" href="#login">Login</a>}
          <button className="ib" type="button" aria-label="Accessibility tools" title="Accessibility" aria-haspopup="dialog" onClick={openA11y}>♿</button>
        </span>
      </div></div>
      <header className="site">
        <div className="wrap brandrow">
          <a className="brand" href="#home" aria-label="DataSetu home">
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" rx="5" fill="currentColor" /><path d="M8 32V22a14 14 0 0 1 28 0v10h-6V22a8 8 0 0 0-16 0v10z" fill="var(--bg)" /></svg>
            <span>DataSetu<small>{t("tagline")}</small></span>
          </a>
          <form className="search" role="search" onSubmit={submit}>
            <label className="sr" htmlFor="gs">Search datasets</label>
            <input id="gs" name="q" type="search" placeholder="Search datasets (Ctrl+K)" />
            <button className="ib sb" type="submit" aria-label="Search">🔍</button>
          </form>
          <button className="ib hamb" type="button" aria-label="Menu" aria-expanded={mob} onClick={() => setMob(!mob)}>☰</button>
        </div>
        <nav className="pnav" aria-label="Main">
          <ul className={"wrap" + (mob ? "" : " closed")}>
            {NAV.map(([label, v], i) => typeof v === "string" ? (
              <li key={i}><a href={v} className={path === "home" ? "on" : ""}>{label}</a></li>
            ) : (
              <li key={i} className={open === i ? "open" : ""} onKeyDown={arrows}>
                <button type="button" aria-haspopup="menu" aria-expanded={open === i} onClick={() => { setOpen(open === i ? null : i); setLm(false); }}>{label} <span aria-hidden="true">▾</span></button>
                <ul className="menu" role="menu">{v.map(([name, href]) => (
                  <li role="none" key={name}><a role="menuitem" href={href} onClick={() => { setOpen(null); setMob(false); }}>{name}</a></li>))}</ul>
              </li>))}
          </ul>
        </nav>
      </header>
    </div>
  );
}
