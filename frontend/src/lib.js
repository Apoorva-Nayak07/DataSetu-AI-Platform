// Shared constants, translations and the API client.
export const SITE = { authorName: "Apoorva Nayak", authorUrl: "#", version: "1.0.0", updated: "2026-10-03" };
export const LN = { en: "English", hi: "हिन्दी", kn: "ಕನ್ನಡ", ta: "தமிழ்", te: "తెలుగు", mr: "मराठी", bn: "বাংলা" };
export const T = {
en:{tagline:"Data Analysis & Decision Support Portal",h1:"Ask questions about your data in plain language.",up:"Upload a CSV file",sample:"Try sample data",feat:"Features",start:"Get started",disc:"AI-generated analysis may contain errors. Please verify important figures before use."},
hi:{tagline:"डेटा विश्लेषण एवं निर्णय सहायता पोर्टल",h1:"अपने डेटा के बारे में सरल भाषा में प्रश्न पूछें।",up:"CSV फ़ाइल अपलोड करें",sample:"नमूना डेटा आज़माएँ",feat:"विशेषताएँ",start:"शुरू करें",disc:"AI द्वारा बनाए गए विश्लेषण में त्रुटियाँ हो सकती हैं। उपयोग से पहले महत्वपूर्ण आँकड़ों की पुष्टि करें।"},
kn:{tagline:"ಡೇಟಾ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ನಿರ್ಧಾರ ಬೆಂಬಲ ಪೋರ್ಟಲ್",h1:"ನಿಮ್ಮ ಡೇಟಾ ಬಗ್ಗೆ ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.",up:"CSV ಕಡತ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",sample:"ಮಾದರಿ ಡೇಟಾ ಪ್ರಯತ್ನಿಸಿ",feat:"ವೈಶಿಷ್ಟ್ಯಗಳು",start:"ಪ್ರಾರಂಭಿಸಿ",disc:"AI ರಚಿತ ವಿಶ್ಲೇಷಣೆಯಲ್ಲಿ ದೋಷಗಳಿರಬಹುದು. ಬಳಸುವ ಮೊದಲು ಪ್ರಮುಖ ಅಂಕಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ."},
ta:{tagline:"தரவு பகுப்பாய்வு மற்றும் முடிவு ஆதரவு தளம்",h1:"உங்கள் தரவைப் பற்றி எளிய மொழியில் கேளுங்கள்.",up:"CSV கோப்பைப் பதிவேற்றவும்",sample:"மாதிரித் தரவை முயற்சிக்கவும்",feat:"அம்சங்கள்",start:"தொடங்குங்கள்",disc:"AI உருவாக்கிய பகுப்பாய்வில் பிழைகள் இருக்கலாம். பயன்படுத்தும் முன் முக்கிய எண்களைச் சரிபார்க்கவும்."},
te:{tagline:"డేటా విశ్లేషణ మరియు నిర్ణయ మద్దతు పోర్టల్",h1:"మీ డేటా గురించి సరళమైన భాషలో ప్రశ్నలు అడగండి.",up:"CSV ఫైల్‌ను అప్‌లోడ్ చేయండి",sample:"నమూనా డేటాను ప్రయత్నించండి",feat:"ఫీచర్లు",start:"ప్రారంభించండి",disc:"AI రూపొందించిన విశ్లేషణలో లోపాలు ఉండవచ్చు. ఉపయోగించే ముందు ముఖ్యమైన సంఖ్యలను ధృవీకరించండి."},
mr:{tagline:"डेटा विश्लेषण आणि निर्णय सहाय्य पोर्टल",h1:"तुमच्या डेटाबद्दल सोप्या भाषेत प्रश्न विचारा.",up:"CSV फाइल अपलोड करा",sample:"नमुना डेटा वापरून पहा",feat:"वैशिष्ट्ये",start:"सुरू करा",disc:"AI ने तयार केलेल्या विश्लेषणात चुका असू शकतात. वापरण्यापूर्वी महत्त्वाचे आकडे तपासा."},
bn:{tagline:"ডেটা বিশ্লেষণ ও সিদ্ধান্ত সহায়তা পোর্টাল",h1:"আপনার ডেটা সম্পর্কে সহজ ভাষায় প্রশ্ন করুন।",up:"CSV ফাইল আপলোড করুন",sample:"নমুনা ডেটা ব্যবহার করুন",feat:"বৈশিষ্ট্য",start:"শুরু করুন",disc:"AI-নির্মিত বিশ্লেষণে ভুল থাকতে পারে। ব্যবহারের আগে গুরুত্বপূর্ণ সংখ্যা যাচাই করুন।"}};
export const NAV = [["Home","#home"],
["About Us",[["About DataSetu","#help?s=about"],["How it works","#help?s=guide"],["FAQ","#help?s=faq"],["Contact Us","#help?s=contact"]]],
["Datasets",[["Upload CSV","#datasets"],["Sample datasets","#datasets"],["Data quality report","#analytics?ask=Run a data quality check"]]],
["Ask the Analyst",[["New conversation","#analytics?new=1"],["Suggested questions","#analytics"]]],
["Insights",[["Business insights","#analytics?ask=Give me an executive summary with business insights"],["Anomaly detection","#analytics?ask=Detect anomalies in the dataset"],["Forecasting","#analytics?ask=Forecast the next 3 months"]]],
["Reports",[["Dashboards","#dashboard"],["Generate report","#report"],["Download Markdown","#report?f=md"]]],
["Help",[["User guide","#help?s=guide"],["Accessibility statement","#help?s=access"],["Terms of use","#help?s=terms"],["Privacy policy","#help?s=privacy"]]]];
export const EX = ["Which region generated the highest revenue?","Show monthly sales trends.","Which products are underperforming?","What are the top five customers?","Generate SQL for this analysis.","Detect anomalies in the dataset."];
export const FEATURES = [["💬","Ask questions","Type a question in plain language and get a clear answer.","Which region has the highest revenue?"],
["📊","Charts and visuals","Bar, line, pie and scatter charts drawn from your data.","Show monthly sales trends"],
["🩺","Data health check","Find missing values and duplicate rows before you rely on a file.","Run a data quality check"],
["⚠️","Unusual values","See which values look out of place and why they were flagged.","Detect anomalies in the dataset"],
["📈","Future trends","A simple forecast of the next three months.","Forecast the next 3 months"],
["📄","Reports","Download your questions and answers as a report.","Give me a summary of this dataset"]];
export const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
export const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} },
};
export const authHeader = () => { const t = store.get("datasetu-token"); return t ? { Authorization: "Bearer " + t } : {}; };
export async function api(url, opts = {}) {
  let r;
  try { r = await fetch(url, { ...opts, headers: { ...authHeader(), ...(opts.headers || {}) } }); } catch { throw new Error("Cannot reach the server. Is the backend running?"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const d = j.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? d.map((e) => `${e.file}: ${e.error}`).join("; ") : "Request failed");
  }
  return j;
}
