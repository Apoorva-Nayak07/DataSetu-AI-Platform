export default function Help() {
  return (
    <div className="page"><div className="wrap sec prose">
      <h1 className="sr">Help</h1>
      <h2 id="about">About DataSetu</h2><p>DataSetu lets you upload CSV files and ask questions in everyday language. It answers with figures, charts, SQL and pandas code, and explains how each answer was reached.</p>
      <h2 id="guide">User guide</h2><ol><li>Open <a href="#datasets">Datasets</a> and upload one or more CSV files, or load the sample data.</li><li>Open <a href="#analytics">Analytics Chat</a> and type a question, for example “Which region has the highest revenue?”.</li><li>Open “Why this answer”, SQL or Pandas under any reply to see the working. Use “Download report” to save the conversation.</li></ol>
      <h2 id="faq">FAQ</h2><p><b>What files are accepted?</b> CSV files up to 20 MB. <b>Is my data shared?</b> Files stay in this application’s own database. <b>Can answers be wrong?</b> Yes; verify important figures against your source records.</p>
      <h2 id="access">Accessibility statement</h2><p>This portal aims to meet WCAG 2.1 AA: keyboard operation, visible focus, skip link, adjustable text size, spacing, contrast, link highlighting and a large cursor (♿ button in the top strip).</p>
      <h2 id="terms">Terms of use</h2><p>Use the service lawfully and only with data you are entitled to analyse. Results are provided as-is for decision support and are not professional advice.</p>
      <h2 id="privacy">Privacy policy</h2><p>Uploaded files and chat messages are stored in the application database you deploy. No data is sent to third parties unless you configure an LLM key, in which case only column names, sample rows and summary statistics are sent.</p>
      <h2 id="contact">Contact us</h2><p>Contact the administrator of your deployment. Add the contact address in <code>frontend/src/lib.js</code>.</p>
    </div></div>
  );
}
