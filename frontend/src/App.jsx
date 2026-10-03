import { useState, useEffect } from "react";
import { T, store, ss } from "./lib.js";
import Header from "./Header.jsx";
import A11yPanel from "./A11yPanel.jsx";
import Footer from "./Footer.jsx";
import Home from "./Home.jsx";
import Datasets from "./Datasets.jsx";
import Chat from "./Chat.jsx";
import Help from "./Help.jsx";
import Dashboard from "./Dashboard.jsx";
import Search from "./Search.jsx";
import Login from "./Login.jsx";
const TITLES = { home: "Home", datasets: "Datasets", analytics: "Analytics Chat", help: "Help", dashboard: "Dashboards", search: "Search", login: "Login" };
export default function App() {
  const [lang, setLang] = useState(store.get("datasetu-lang") || "en");
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || "light");
  const [a11y, setA11y] = useState(() => { try { return JSON.parse(store.get("datasetu-a11y") || "{}"); } catch { return {}; } });
  const [showA, setShowA] = useState(false);
  const [term, setTerm] = useState("");
  const [user, setUser] = useState(store.get("datasetu-user") || "");
  const onAuth = (a) => { store.set("datasetu-token", a.token); store.set("datasetu-user", a.username); setUser(a.username); location.hash = "#analytics"; };
  const logout = () => { store.set("datasetu-token", ""); store.set("datasetu-user", ""); setUser(""); location.hash = "#home"; };
  const [hash, setHash] = useState(location.hash || "#home");
  const t = (k) => (T[lang] && T[lang][k]) || T.en[k];
  const [path, qs] = hash.slice(1).split("?");
  useEffect(() => { const h = () => setHash(location.hash || "#home"); window.addEventListener("hashchange", h); return () => window.removeEventListener("hashchange", h); }, []);
  useEffect(() => { document.documentElement.lang = lang; store.set("datasetu-lang", lang); }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; store.set("datasetu-theme-v2", theme); }, [theme]);
  useEffect(() => {
    const el = document.documentElement;
    ["hc", "inv", "sat", "links", "sp", "lh", "noimg", "big"].forEach((k) => el.classList.toggle(k, !!a11y[k]));
    el.style.setProperty("--fs", a11y.fs || 100);
    store.set("datasetu-a11y", JSON.stringify(a11y));
  }, [a11y]);
  useEffect(() => {
    document.title = `${TITLES[path] || "Home"} – DataSetu`;
    if (path === "report") {
      const sid = ss.get("sid");
      const f = qs; history.replaceState(null, "", "#analytics"); setHash("#analytics");
      if (sid) window.open((new URLSearchParams(qs || "").get("f") === "md" ? "/api/report-md/" : "/api/report/") + sid, "_blank"); else alert("Ask at least one question first.");
    }
    if (path === "help" && qs) { const id = new URLSearchParams(qs).get("s"); setTimeout(() => document.getElementById(id)?.scrollIntoView(), 0); }
    else if (path !== "analytics") window.scrollTo(0, 0);
  }, [hash]);
  const consume = () => { history.replaceState(null, "", "#analytics"); setHash("#analytics"); };
  return (
    <>
      <a className="skip" href="#main">Skip to main content</a>
      <Header t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} openA11y={() => setShowA(true)} setTerm={setTerm} path={path} user={user} logout={logout} />
      <div className="crumb"><div className="wrap"><a href="#home">Home</a> › <span aria-current="page">{TITLES[path] || "Home"}</span></div></div>
      <main id="main">
        {path === "datasets" ? <Datasets term={term} /> : path === "analytics" ? <Chat hash={hash} consume={consume} /> : path === "help" ? <Help /> : path === "dashboard" ? <Dashboard /> : path === "search" ? <Search q={new URLSearchParams(qs || "").get("q") || ""} /> : path === "login" ? <Login onAuth={onAuth} /> : <Home t={t} />}
      </main>
      <Footer t={t} />
      {showA && <A11yPanel a11y={a11y} setA11y={setA11y} onClose={() => setShowA(false)} />}
    </>
  );
}
