import { useState } from "react";
import { api } from "./lib.js";
export default function Login({ onAuth }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const go = async (path, body) => { setErr(""); try { onAuth(await api("/api/auth/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || { username: u, password: p }) })); } catch (e) { setErr(e.message); } };
  return (
    <div className="page"><div className="wrap sec" style={{ maxWidth: "34rem" }}>
      <h2>Login</h2>
      <p className="lead">Sign in to keep your question history, or continue as a guest.</p>
      <form onSubmit={(e) => { e.preventDefault(); go("login"); }}>
        <p><label htmlFor="u">Username</label><br /><input id="u" type="text" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} style={{ width: "100%" }} /></p>
        <p><label htmlFor="p">Password (8+ characters)</label><br /><input id="p" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} style={{ width: "100%", minHeight: "3rem", padding: ".5rem .75rem", border: "2px solid var(--bd)", borderRadius: 4, background: "var(--bg)", color: "var(--fg)", font: "inherit" }} /></p>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="cta" style={{ justifyContent: "flex-start" }}>
          <button className="btn primary" type="submit">Login</button>
          <button className="btn" type="button" onClick={() => go("register")}>Create account</button>
          <button className="btn" type="button" onClick={() => go("guest", {})}>Continue as guest</button></div>
      </form>
    </div></div>
  );
}
