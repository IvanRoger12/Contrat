import React, { useEffect, useState } from "react";
import { Upload, Search, FileText, Edit3 } from "lucide-react";

/* ==============================
   Types
============================== */
type Tab = "analyze" | "compare" | "qa" | "sign";
type Risk = "low" | "medium" | "high";

interface ClauseIssue { clause:string; risk:Risk; issue:string; suggestion:string }
interface NegotiationPoint { point:string; priority:"low"|"medium"|"high"; alternative:string }
interface AnalysisResult {
  fileName?:string; fileSize?:number; analyzedAt:string;
  globalScore:number; riskLevel:Risk; problematicClauses:ClauseIssue[];
  negotiationPoints:NegotiationPoint[]; summary:string; sourceText:string;
}

/* ==============================
   i18n (FR / EN)
============================== */
const I18N = {
  FR: {
    appTitle: "ContraScope",
    appSubtitle: "MVP • Analyse • Comparaison • Q&A • Signature",
    // header
    themeLight: "☀️",
    themeDark: "🌙",
    // tabs
    tabAnalyze: "Analyser",
    tabCompare: "Comparer",
    tabQA: "Q&A",
    tabSign: "Signature",
    // upload/analyze
    dragDrop: "Glissez un PDF/DOCX ici ou cliquez",
    formats: "Formats : PDF, DOCX — ≤ 10 Mo",
    pasteText: "Ou collez le texte du contrat",
    analyzeBtn: "Analyser",
    analyzing: "Analyse en cours…",
    analyzeHint: "Importez un fichier ou collez du texte pour lancer l'analyse.",
    // results
    riskLow: "Faible",
    riskMed: "Moyen",
    riskHigh: "Élevé",
    summary: "Résumé",
    probClauses: "Clauses problématiques",
    negoPoints: "Points de négociation",
    // compare
    compareTitle: "Comparaison A/B",
    compareDesc: "Comparez deux versions d'un contrat pour identifier les modifications",
    versionA: "Version A (original)",
    versionB: "Version B (modifiée)",
    launchComparison: "Lancer la comparaison",
    compareEmpty: "Le résultat de la comparaison s'affichera ici après avoir sélectionné deux fichiers.",
    // qa
    qaTitle: "Questions sur le contrat",
    qaDesc: "Posez des questions sur le contrat analysé",
    qaPlaceholder: "Posez n'importe quelle question (ex : durée, résiliation, responsabilité…)",
    search: "Chercher",
    results: "Résultats",
    qaAnalyzeFirst: "Analysez d'abord un contrat.",
    qaNone: "Aucune clause correspondante trouvée.",
    qaFound: (k:string) => `Clause trouvée : « ${k} »`,
    // sign
    signTitle: "Signature Électronique",
    signDesc: "Signez électroniquement vos contrats",
    newSignature: "Nouvelle signature",
    signerName: "Nom du signataire",
    signerEmail: "Email du signataire",
    signNow: "Signer maintenant",
    signHistory: "Historique des signatures",
    noSignatures: "Aucune signature enregistrée.",
    // alerts
    alertReadFail: "Impossible de lire ce fichier. Essayez un autre PDF/DOCX ou collez le texte.",
    alertChooseTwo: "Choisissez deux fichiers pour voir les différences.",
  },
  EN: {
    appTitle: "ContraScope",
    appSubtitle: "MVP • Analysis • Comparison • Q&A • Signature",
    // header
    themeLight: "☀️",
    themeDark: "🌙",
    // tabs
    tabAnalyze: "Analyze",
    tabCompare: "Compare",
    tabQA: "Q&A",
    tabSign: "Signature",
    // upload/analyze
    dragDrop: "Drop a PDF/DOCX here or click",
    formats: "Formats: PDF, DOCX — ≤ 10 MB",
    pasteText: "Or paste contract text",
    analyzeBtn: "Analyze",
    analyzing: "Analyzing…",
    analyzeHint: "Import a file or paste text to start the analysis.",
    // results
    riskLow: "Low",
    riskMed: "Medium",
    riskHigh: "High",
    summary: "Summary",
    probClauses: "Problematic Clauses",
    negoPoints: "Negotiation Points",
    // compare
    compareTitle: "A/B Comparison",
    compareDesc: "Compare two contract versions to identify changes",
    versionA: "Version A (original)",
    versionB: "Version B (modified)",
    launchComparison: "Launch Comparison",
    compareEmpty: "The comparison result will appear here after selecting two files.",
    // qa
    qaTitle: "Contract Questions",
    qaDesc: "Ask questions about the analyzed contract",
    qaPlaceholder: "Ask any question (e.g.: term, termination, liability…)",
    search: "Search",
    results: "Results",
    qaAnalyzeFirst: "Analyze a contract first.",
    qaNone: "No matching clause found.",
    qaFound: (k:string) => `Clause found: “${k}”`,
    // sign
    signTitle: "Electronic Signature",
    signDesc: "Sign your contracts electronically",
    newSignature: "New Signature",
    signerName: "Signer Name",
    signerEmail: "Signer Email",
    signNow: "Sign Now",
    signHistory: "Signature History",
    noSignatures: "No signatures recorded.",
    // alerts
    alertReadFail: "Unable to read this file. Try another PDF/DOCX or paste the text.",
    alertChooseTwo: "Choose two files to view differences.",
  },
};
type LangKey = keyof typeof I18N;

/* ==============================
   Utils
============================== */
const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

const esc = (s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const hashLite=(s:string)=>{ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return ("00000000"+(h>>>0).toString(16)).slice(-8) }
const riskPill = (r: Risk) =>
  r==="low"?"text-emerald-600 bg-emerald-50 border-emerald-200":
  r==="medium"?"text-amber-600 bg-amber-50 border-amber-200":
  "text-red-600 bg-red-50 border-red-200";

const prettyRisk = (r: Risk, L: typeof I18N[LangKey]) =>
  r==="low" ? L.riskLow : r==="medium" ? L.riskMed : L.riskHigh;

/* ==============================
   PDF/DOCX -> texte (démo local)
============================== */
async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(`CONTRAT DE PRESTATION DE SERVICES

Article 1 - Objet
Le présent contrat a pour objet la fourniture de services de conseil par le Prestataire au Client.

Article 2 - Durée
Le présent contrat est conclu pour une durée de 12 mois à compter de sa signature. Il se renouvelle automatiquement par tacite reconduction pour des périodes successives de 12 mois, sauf dénonciation par l'une des parties avec un préavis de 30 jours.

Article 3 - Résiliation
Chaque partie peut résilier le présent contrat à tout moment, sans motif, moyennant un préavis écrit de 30 jours. En cas de manquement grave de l'une des parties à ses obligations, l'autre partie peut procéder à la résiliation immédiate du contrat.

Article 4 - Responsabilité
La responsabilité du Prestataire est limitée au montant des honoraires perçus au titre du présent contrat. Cette limitation ne s'applique pas en cas de dol ou de faute lourde.

Article 5 - Confidentialité
Les parties s'engagent à préserver la confidentialité de toutes les informations échangées dans le cadre du présent contrat. Cette obligation perdure pendant 5 ans après la fin du contrat.

Article 6 - Données personnelles
Le traitement des données personnelles s'effectue conformément au RGPD. Le Prestataire s'engage à mettre en place toutes les mesures techniques et organisationnelles appropriées.`);
    };
    reader.readAsText(file);
  });
}

/* ==============================
   Analyse heuristique locale
============================== */
function analyzeTextLocally(raw:string):Omit<AnalysisResult,"analyzedAt">{
  const text = raw.replace(/\s+/g," ").trim();
  const rules:{name:string;pattern:RegExp;risk:Risk;issue:string;suggestion:string}[] = [
    { name:"Résiliation unilatérale", pattern:/(résiliation|termination).*?(unilat|sans\s+préavis|without\s+notice)/i, risk:"high", issue:"Résiliation possible par une seule partie, parfois sans préavis.", suggestion:"Exiger un préavis écrit de 30 jours minimum et motif légitime." },
    { name:"Limitation de responsabilité étendue", pattern:/(limitation|responsabilit[eé]|liability).*(illimit|toutes\s+causes|any\s+cause)/i, risk:"medium", issue:"Limite la responsabilité pour toute cause.", suggestion:"Exclure la négligence grave/dolosive et prévoir un plafond raisonnable." },
    { name:"Indemnisation à sens unique", pattern:/(indemn[iy]sation|hold\s+harmless).*(uniquement|one\s+way|b[eé]n[eé]fice\s+de)/i, risk:"medium", issue:"L'indemnisation ne bénéficie qu'à une partie.", suggestion:"Rendre l'indemnisation réciproque, proportionnée au risque." },
    { name:"Renouvellement automatique", pattern:/(renouvellement\s+automatique|auto\s*renew|tacite\s+reconduction)/i, risk:"low", issue:"Reconduction sans action explicite.", suggestion:"Notification 30 jours avant + possibilité d'opposition simple." },
    { name:"Données/Confidentialité", pattern:/(donn[eé]es|RGPD|GDPR|confidentialit[eé]|confidentiality)/i, risk:"medium", issue:"Mentions sensibles à cadrer.", suggestion:"Ajouter DPA RGPD, finalités, sous-traitants, mesures de sécurité." },
  ];
  const found:ClauseIssue[] = [];
  for (const r of rules){ const m=text.match(r.pattern); if(m) found.push({clause:r.name,risk:r.risk,issue:r.issue,suggestion:r.suggestion}); }
  let score=30; const w={low:8,medium:15,high:25} as const;
  for(const f of found){ score += w[f.risk]; }
  score = Math.max(0,Math.min(100,score));
  const riskLevel:Risk = score>=70?"high":score>=45?"medium":"low";
  const negotiationPoints:NegotiationPoint[] = found.map(f=>({
    point:f.clause, priority:f.risk==="high"?"high":f.risk==="medium"?"medium":"low",
    alternative:
      f.clause==="Résiliation unilatérale" ? "Toute résiliation requiert un préavis écrit de trente (30) jours, motivé."
    : f.clause==="Limitation de responsabilité étendue" ? "La responsabilité est limitée aux dommages directs ; la négligence grave reste exclue de toute limitation."
    : f.clause==="Indemnisation à sens unique" ? "Les obligations d'indemnisation sont réciproques et proportionnées aux risques respectifs."
    : f.clause==="Renouvellement automatique" ? "Le renouvellement nécessite une notification reçue 30 jours avant l'échéance."
    : "Les traitements de données sont régis par un DPA conforme au RGPD, précisant finalités et mesures de sécurité."
  }));
  const summary = found.length===0
    ? "Aucun risque majeur détecté par les règles de base. Vérifier clauses financières et PI."
    : `${found.length} clause(s) sensible(s) détectée(s). Focus : ${found.slice(0,2).map(c=>c.clause).join(", ")}${found.length>2?" …":""}`;
  return { globalScore:score, riskLevel, problematicClauses:found, negotiationPoints, summary, sourceText:text };
}

/* ==============================
   Diff mot-à-mot
============================== */
async function makeDiffHTML(fileA:File, fileB:File){
  const [a,b]=await Promise.all([extractTextFromFile(fileA), extractTextFromFile(fileB)]);
  const A=a.split(/\s+/), B=b.split(/\s+/);
  const dp=Array(A.length+1).fill(0).map(()=>Array(B.length+1).fill(0));
  for(let i=1;i<=A.length;i++){ for(let j=1;j<=B.length;j++){ dp[i][j] = A[i-1]===B[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]); } }
  const out:string[]=[]; let i=A.length, j=B.length;
  while(i>0 && j>0){
    if(A[i-1]===B[j-1]){ out.unshift(`<span>${esc(A[i-1])}</span>`); i--; j--; }
    else if(dp[i-1][j]>=dp[i][j-1]){ out.unshift(`<del class="bg-red-500/20 text-red-200 px-1 rounded">${esc(A[i-1])}</del>`); i--; }
    else { out.unshift(`<ins class="bg-emerald-500/20 text-emerald-200 px-1 rounded">${esc(B[j-1])}</ins>`); j--; }
  }
  while(i-- > 0) out.unshift(`<del class="bg-red-500/20 text-red-200 px-1 rounded">${esc(A[i+1])}</del>`);
  while(j-- > 0) out.unshift(`<ins class="bg-emerald-500/20 text-emerald-200 px-1 rounded">${esc(B[j+1])}</ins>`);
  return out.join(" ");
}

/* ==============================
   Q&A local (i18n) + API fallback
============================== */
function qaFindLocal(text:string, question:string, L: typeof I18N[LangKey]){
  if(!text) return [{clause:"—", summary:L.qaAnalyzeFirst}];
  const q=question.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  const hits:{clause:string;summary:string}[]=[];
  for(const k of q){
    const re=new RegExp(`.{0,60}(${k}.{0,120})`,"gi"); let m;
    while((m=re.exec(text))!==null){ hits.push({clause:m[1], summary:L.qaFound(k)}) }
  }
  return hits.length?hits:[{clause:"—", summary:L.qaNone}];
}

async function qaFindAPI(text:string, question:string, lang:LangKey){
  if(!API_BASE) throw new Error("no api");
  const r = await fetch(`${API_BASE.replace(/\/$/,"")}/qa`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, question, lang })
  });
  if(!r.ok) throw new Error("bad response");
  const data = await r.json();
  // attendu: { answers: [{clause:"...", summary:"..."}] }
  return (data.answers ?? []) as {clause:string; summary:string}[];
}

/* ==============================
   Component
============================== */
export default function ContraScope() {
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState<LangKey>("FR");
  const L = I18N[lang];

  const [tab, setTab] = useState<Tab>("analyze");

  // mode clair lisible
  useEffect(() => {
    const html = document.documentElement;
    if (dark) { html.classList.remove("light"); html.style.colorScheme = "dark"; }
    else { html.classList.add("light"); html.style.colorScheme = "light"; }
  }, [dark]);

  // analyze
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // compare
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [diffHTML, setDiffHTML] = useState("");

  // qa
  const [question, setQuestion] = useState("");
  const [qa, setQa] = useState<{clause:string;summary:string}[]|null>(null);

  // sign
  const [sigName,setSigName]=useState("");
  const [sigEmail,setSigEmail]=useState("");
  const [sigHistory,setSigHistory]=useState<{id:string;at:string;signer:string;email:string}[]>([]);

  /* actions */
  const handleFiles = async (incoming: File[]) => {
    if (!incoming.length) return;
    setFiles(prev => [...prev, ...incoming]);
    await analyzeFile(incoming[0]);
  };

  const analyzeNow = async () => {
    if (textInput.trim()) {
      setBusy(true);
      const local = analyzeTextLocally(textInput);
      setResult({ ...local, analyzedAt: new Date().toISOString(), fileName: lang==="FR" ? "Texte collé" : "Pasted text" });
      setBusy(false);
      return;
    }
    if (files[0]) await analyzeFile(files[0]);
  };

  const analyzeFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      const local = analyzeTextLocally(text);
      setResult({ ...local, analyzedAt: new Date().toISOString(), fileName: file.name, fileSize: file.size });
    } catch {
      alert(L.alertReadFail);
    } finally {
      setBusy(false);
    }
  };

  const runDiff = async () => {
    if (!fileA || !fileB) return alert(L.alertChooseTwo);
    const html = await makeDiffHTML(fileA, fileB);
    setDiffHTML(html);
  };

  const onSearch = async () => {
    if (!result) { setQa([{clause:"—",summary:L.qaAnalyzeFirst}]); return; }
    // Essaye l’API d’abord, retombe en local si indispo
    try {
      const apiAns = await qaFindAPI(result.sourceText, question, lang);
      if (apiAns && apiAns.length) setQa(apiAns);
      else setQa(qaFindLocal(result.sourceText, question, L));
    } catch {
      setQa(qaFindLocal(result.sourceText, question, L));
    }
  };

  const signNow = async () => {
    const at = new Date().toISOString();
    const id = hashLite((result?.fileName||"")+(result?.analyzedAt||"")+sigName+sigEmail+at);

    // Option : ping l’API si dispo
    if (API_BASE) {
      try {
        await fetch(`${API_BASE.replace(/\/$/,"")}/sign`, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            fileName: result?.fileName || "Doc",
            analyzedAt: result?.analyzedAt || at,
            signer: sigName || "—",
            email: sigEmail || "—",
          })
        });
      } catch {
        // silencieux : fallback local
      }
    }

    setSigHistory([{id, at, signer:sigName||"—", email:sigEmail||"—"}, ...sigHistory]);
    setSigName(""); setSigEmail("");
  };

  /* ==== UI ==== */
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      dark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
           : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      {/* HEADER */}
      <div className={`backdrop-blur-sm border-b transition-colors duration-300 ${
        dark ? "bg-slate-800/80 border-slate-700/50" : "bg-white/80 border-gray-200/50"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                  {L.appTitle.slice(0,6)}<span className="text-cyan-400">{L.appTitle.slice(6)}</span>
                </h1>
                <p className={`text-sm ${dark ? "text-slate-400" : "text-gray-600"}`}>{L.appSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDark(!dark)}
                className={`p-2 rounded-lg transition-colors ${
                  dark ? "bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white"
                       : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                }`}
                title={dark ? "Light" : "Dark"}
              >
                {dark ? I18N.FR.themeLight : I18N.FR.themeDark}
              </button>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LangKey)}
                className={`border rounded-lg px-3 py-1 text-sm transition-colors ${
                  dark ? "bg-slate-700/50 border-slate-600 text-slate-200"
                       : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                <option value="FR">FR</option>
                <option value="EN">EN</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* NAV TABS */}
      <div className={`backdrop-blur-sm border-b transition-colors duration-300 ${
        dark ? "bg-slate-800/60 border-slate-700/30" : "bg-white/60 border-gray-200/30"
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-3 py-4">
            <button
              onClick={() => setTab("analyze")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                tab === "analyze"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                  : dark ? "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                         : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
              }`}
            >
              <Upload className="w-4 h-4" />
              {L.tabAnalyze}
            </button>
            <button
              onClick={() => setTab("compare")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                tab === "compare"
                  ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
                  : dark ? "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                         : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              {L.tabCompare}
            </button>
            <button
              onClick={() => setTab("qa")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                tab === "qa"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                  : dark ? "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                         : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
              }`}
            >
              <Search className="w-4 h-4" />
              {L.tabQA}
            </button>
            <button
              onClick={() => setTab("sign")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                tab === "sign"
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25"
                  : dark ? "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                         : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {L.tabSign}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {tab === "analyze" && (
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Upload */}
            <div className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:border-cyan-500/50 transition-all group ${
                  dark ? "border-slate-600/50 hover:bg-slate-800/30"
                       : "border-gray-300/50 hover:bg-gray-50/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
                  {L.dragDrop}
                </h3>
                <p className={`${dark ? "text-slate-400" : "text-gray-600"}`}>{L.formats}</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  hidden
                  onChange={(e)=>handleFiles(Array.from(e.target.files||[]))}
                />
              </div>

              <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className={`w-5 h-5 ${dark ? "text-slate-400" : "text-gray-500"}`} />
                  <label className={`font-medium ${dark ? "text-slate-300" : "text-gray-700"}`}>
                    {L.pasteText}
                  </label>
                </div>
                <textarea
                  className={`w-full h-44 border rounded-xl px-4 py-3 placeholder-opacity-60 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all resize-none ${
                    dark ? "bg-slate-900/50 border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                         : "bg-gray-50/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-cyan-500"
                  }`}
                  placeholder={L.pasteText + "…"}
                  value={textInput}
                  onChange={(e)=>setTextInput(e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={analyzeNow}
                    disabled={busy}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                  >
                    {busy ? L.analyzing : L.analyzeBtn}
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div>
              {busy ? (
                <div className={`backdrop-blur-sm rounded-2xl p-10 border text-center transition-colors ${
                  dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
                }`}>
                  <div className="animate-spin w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className={`${dark ? "text-slate-300" : "text-gray-700"}`}>{L.analyzing}</p>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                    dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className={`text-sm ${dark ? "text-slate-400" : "text-gray-600"}`}>
                          {result.fileName || (lang==="FR"?"Texte":"Text")}
                        </p>
                        <p className={`text-xs ${dark ? "text-slate-500" : "text-gray-500"}`}>
                          {new Date(result.analyzedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${riskPill(result.riskLevel)}`}>
                          {prettyRisk(result.riskLevel, L)}
                        </div>
                        <div className={`text-2xl font-bold mt-1 ${dark ? "text-white" : "text-gray-900"}`}>
                          {result.globalScore}/100
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-xl p-4 transition-colors ${
                      dark ? "bg-slate-900/50 border-slate-600/30" : "bg-gray-50/50 border-gray-200/30"
                    }`}>
                      <h4 className={`font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
                        {L.summary}
                      </h4>
                      <p className={`text-sm ${dark ? "text-slate-300" : "text-gray-700"}`}>
                        {result.summary}
                      </p>
                    </div>
                  </div>

                  {result.problematicClauses.length > 0 && (
                    <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                      dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
                    }`}>
                      <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.probClauses}</h3>
                      <div className="space-y-4">
                        {result.problematicClauses.map((c, i) => (
                          <div key={i} className={`rounded-xl p-4 border ${
                            dark ? "bg-slate-900/50 border-slate-600/30" : "bg-gray-50/50 border-gray-200/30"
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`${dark?"text-white":"text-gray-900"} font-medium`}>{c.clause}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${riskPill(c.risk)}`}>
                                {prettyRisk(c.risk, L)}
                              </span>
                            </div>
                            <p className={`${dark?"text-slate-300":"text-gray-700"} text-sm mb-3`}>{c.issue}</p>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                              <p className="text-emerald-700 dark:text-emerald-200 text-sm">
                                <span className="font-medium">💡</span> {c.suggestion}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.negotiationPoints.length > 0 && (
                    <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                      dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
                    }`}>
                      <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.negoPoints}</h3>
                      <div className="space-y-3">
                        {result.negotiationPoints.map((p, i) => (
                          <div key={i} className={`rounded-xl p-4 border ${
                            dark ? "bg-slate-900/50 border-slate-600/30" : "bg-gray-50/50 border-gray-200/30"
                          }`}>
                            <h4 className={`${dark?"text-white":"text-gray-900"} font-medium mb-2`}>{p.point}</h4>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                              <p className="text-blue-900 dark:text-blue-200 text-sm">"{p.alternative}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-2xl p-10 border text-center ${
                  dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
                }`}>
                  <FileText className="w-16 h-16 mx-auto mb-5 text-slate-500" />
                  <p className={`${dark?"text-slate-300":"text-gray-700"}`}>{L.analyzeHint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-2">
              <h2 className={`${dark?"text-white":"text-gray-900"} text-3xl font-bold mb-2`}>{L.compareTitle}</h2>
              <p className={`${dark?"text-slate-400":"text-gray-600"}`}>{L.compareDesc}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`rounded-2xl p-6 border ${
                dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
              }`}>
                <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.versionA}</h3>
                <input 
                  className={`block w-full text-sm rounded-lg px-3 py-2 focus:outline-none ${
                    dark ? "text-slate-300 bg-slate-900/50 border border-slate-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                         : "text-gray-800 bg-gray-50/50 border border-gray-300/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  }`}
                  type="file" 
                  accept=".pdf,.docx" 
                  onChange={(e)=>setFileA(e.target.files?.[0]||null)} 
                />
                {fileA && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2">✓ {fileA.name}</p>}
              </div>

              <div className={`rounded-2xl p-6 border ${
                dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
              }`}>
                <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.versionB}</h3>
                <input 
                  className={`block w-full text-sm rounded-lg px-3 py-2 focus:outline-none ${
                    dark ? "text-slate-300 bg-slate-900/50 border border-slate-600/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                         : "text-gray-800 bg-gray-50/50 border border-gray-300/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  }`}
                  type="file" 
                  accept=".pdf,.docx" 
                  onChange={(e)=>setFileB(e.target.files?.[0]||null)} 
                />
                {fileB && <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2">✓ {fileB.name}</p>}
              </div>
            </div>
            
            <div className="text-center">
              <button 
                className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
                onClick={runDiff}
              >
                {L.launchComparison}
              </button>
            </div>
            
            <div className={`rounded-2xl p-6 border min-h-64 ${
              dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
            }`}>
              <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.results}</h3>
              <div className={`rounded-xl p-4 overflow-auto max-h-96 ${
                dark ? "bg-slate-900/50" : "bg-gray-50/50"
              }`}/>
              {diffHTML ? (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{__html:diffHTML}} />
              ) : (
                <p className={`${dark?"text-slate-400":"text-gray-600"} text-center py-8`}>{L.compareEmpty}</p>
              )}
            </div>
          </div>
        )}

        {tab === "qa" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className={`${dark?"text-white":"text-gray-900"} text-3xl font-bold mb-2`}>{L.qaTitle}</h2>
              <p className={`${dark?"text-slate-400":"text-gray-600"} mb-6`}>{L.qaDesc}</p>
            </div>
            
            <div className={`rounded-2xl p-6 border ${
              dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
            }`}>
              <div className="flex gap-3">
                <input
                  className={`flex-1 rounded-xl px-4 py-3 focus:outline-none transition-all ${
                    dark ? "bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                         : "bg-gray-50/50 border border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  }`}
                  placeholder={L.qaPlaceholder}
                  value={question}
                  onChange={(e)=>setQuestion(e.target.value)}
                />
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                  onClick={onSearch}
                >
                  {L.search}
                </button>
              </div>
            </div>
            
            <div className={`rounded-2xl p-6 border ${
              dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
            }`}>
              <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.results}</h3>
              <div className="space-y-3">
                {qa?.length ? qa.map((r,idx)=>(
                  <div key={idx} className={`rounded-xl p-4 border ${
                    dark ? "bg-slate-900/50 border-slate-600/30" : "bg-gray-50/50 border-gray-200/30"
                  }`}>
                    <p className="text-emerald-700 dark:text-emerald-300 font-medium mb-2">{r.summary}</p>
                    <p className={`${dark?"text-slate-300":"text-gray-700"} text-sm`}>{r.clause}</p>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className={`${dark?"text-slate-400":"text-gray-600"}`}>{L.qaAnalyzeFirst}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "sign" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className={`${dark?"text-white":"text-gray-900"} text-3xl font-bold mb-2`}>{L.signTitle}</h2>
              <p className={`${dark?"text-slate-400":"text-gray-600"} mb-6`}>{L.signDesc}</p>
            </div>
            
            <div className={`rounded-2xl p-6 border ${
              dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
            }`}>
              <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.newSignature}</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <input 
                  className={`rounded-xl px-4 py-3 focus:outline-none transition-all ${
                    dark ? "bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                         : "bg-gray-50/50 border border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  }`}
                  placeholder={L.signerName} 
                  value={sigName} 
                  onChange={(e)=>setSigName(e.target.value)} 
                />
                <input 
                  className={`rounded-xl px-4 py-3 focus:outline-none transition-all ${
                    dark ? "bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                         : "bg-gray-50/50 border border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  }`}
                  placeholder={L.signerEmail} 
                  value={sigEmail} 
                  onChange={(e)=>setSigEmail(e.target.value)} 
                />
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                  onClick={signNow}
                >
                  {L.signNow}
                </button>
              </div>
            </div>

            <div className={`rounded-2xl p-6 border ${
              dark ? "bg-slate-800/50 border-slate-700/50" : "bg-white/70 border-gray-200/50"
            }`}>
              <h3 className={`${dark?"text-white":"text-gray-900"} font-semibold mb-4`}>{L.signHistory}</h3>
              <div className="space-y-3">
                {sigHistory.length ? sigHistory.map((s,idx)=>(
                  <div key={idx} className={`rounded-xl p-4 border flex items-center justify-between ${
                    dark ? "bg-slate-900/50 border-slate-600/30" : "bg-gray-50/50 border-gray-200/30"
                  }`}>
                    <div>
                      <p className={`${dark?"text-white":"text-gray-900"} font-medium`}>ID #{s.id}</p>
                      <p className={`${dark?"text-slate-400":"text-gray-500"} text-xs`}>{new Date(s.at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`${dark?"text-white":"text-gray-900"} font-medium`}>{s.signer}</p>
                      <p className={`${dark?"text-slate-400":"text-gray-600"} text-sm`}>{s.email}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Edit3 className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className={`${dark?"text-slate-400":"text-gray-600"}`}>{L.noSignatures}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
