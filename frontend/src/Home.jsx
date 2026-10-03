import { api, FEATURES } from "./lib.js";
export default function Home({ t }) {
  const sample = async () => { try { await api("/api/sample", { method: "POST" }); location.hash = "#datasets"; } catch (e) { alert(e.message); } };
  const Buttons = () => (<div className="cta"><a className="btn lg primary" href="#datasets">{t("up")}</a><button className="btn lg" type="button" onClick={sample}>{t("sample")}</button></div>);
  return (
    <div className="page">
      <section className="hero" aria-labelledby="h1"><div className="wrap center">
        <svg className="mark" width="64" height="64" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="4" fill="currentColor" /><path d="M8 24h4v-8H8zm8 0h4V10h-4zm8 0h4v-5h-4z" fill="var(--bg)" /></svg>
        <h1 id="h1">DataSetu</h1>
        <p className="tag">{t("h1")}</p>
        <p className="lead">Upload one or more CSV files and get answers, charts, SQL, unusual-value checks and reports, with the reasoning shown.</p>
        <Buttons />
      </div></section>
      <section className="sec" aria-labelledby="h-f"><div className="wrap">
        <h2 id="h-f" className="center">{t("feat")}</h2>
        <p className="lead center">Everything you need to understand a spreadsheet, without writing code.</p>
        <div className="grid">{FEATURES.map(([icon, title, text, q]) => (
          <a key={title} className="card" href={`#analytics?ask=${encodeURIComponent(q)}`}>
            <span className="tile" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{text}</p><span className="go">Open →</span></a>))}</div>
      </div></section>
      <section className="sec" aria-labelledby="h-s"><div className="wrap"><div className="band">
        <h2 id="h-s" className="center">{t("start")}</h2>
        <ol className="steps">
          <li><span className="num">1</span><h3>Upload your file</h3><p>Add a CSV file, or load the sample.</p></li>
          <li><span className="num">2</span><h3>Ask a question</h3><p>Type it the way you would say it.</p></li>
          <li><span className="num">3</span><h3>Download your report</h3><p>Save the conversation as a report.</p></li>
        </ol>
        <Buttons />
      </div></div></section>
    </div>
  );
}
