import { useState, useEffect } from "react";
import { SITE } from "./lib.js";
export default function Footer({ t }) {
  const [status, setStatus] = useState("Checking…");
  useEffect(() => { fetch("/api/health").then((r) => setStatus(r.ok ? "Operational" : "Degraded")).catch(() => setStatus("Unavailable")); }, []);
  return (
    <footer className="site ft">
      <div className="wrap">
        <div className="fcols">
          <div><h3>About</h3><p>DataSetu is a plain-language data analysis and decision support portal.</p></div>
          <div><h3>Quick links</h3><a href="#home">Home</a><a href="#datasets">Datasets</a><a href="#analytics">Analytics Chat</a></div>
          <div><h3>Help</h3><a href="#help?s=faq">FAQ</a><a href="#help?s=access">Accessibility Statement</a><a href="#help?s=terms">Terms of Use</a><a href="#help?s=privacy">Privacy Policy</a><a href="#help?s=contact">Contact Us</a></div>
          <div><h3>System status</h3><p>API: {status}</p><a href="/api/health">Health endpoint</a><a href="/docs">API documentation</a></div>
        </div>
        <p className="disc">{t("disc")}</p>
        <p className="meta">Last updated: {SITE.updated} · Version {SITE.version}</p>
      </div>
      <div className="copy"><p>© {new Date().getFullYear()} DataSetu. All rights reserved. Built by <a href={SITE.authorUrl}>{SITE.authorName}</a>.</p>
        <button className="btn" type="button" onClick={() => window.scrollTo({ top: 0 })}>Back to top</button></div>
    </footer>
  );
}
