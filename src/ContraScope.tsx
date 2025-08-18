import React, { useEffect, useRef, useState } from "react";
import {
  Upload, FileText, AlertTriangle, CheckCircle, Download, GitCompare, MessageSquare, Star,
  Eye, AlertCircle, Sparkles, Brain, Lightbulb, Languages, Search, PenTool, Link as LinkIcon,
  Clock, Lock, Copy, Check, Sun, Moon
} from "lucide-react";

/** -------------------------------------------------------------
 * ContraScope — MVP complet (front-only)
 *  - Analyse locale (heuristique)
 *  - Comparaison A/B mot-à-mot
 *  - Q&A par recherche d’extraits
 *  - Signature locale (empreinte + horodatage) + historique
 *  - Multilingue + thème sombre/clair
 * ------------------------------------------------------------- */

type Risk = "low"|"medium"|"high";
interface ClauseIssue { clause:string; risk:Risk; issue:string; suggestion:string }
interface NegotiationPoint { point:string; priority:"low"|"medium"|"high"; alternative:string }
interface AnalysisResult {
  fileName?:string; fileSize?:number; analyzedAt:string;
  globalScore:number; riskLevel:Risk; problematicClauses:ClauseIssue[];
  negotiationPoints:NegotiationPoint[]; summary:string; sourceText:string;
}

// ---------- i18n ----------
const tdict = {
  fr: {
    subtitle:"MVP • Analyse • Comparaison • Q&A • Signature",
    navAnalyze:"Analyser", navCompare:"Comparer", navQA:"Q&A", navSign:"Signature",
    importTitle:"Importer un contrat", importHelp:"Glissez un PDF/DOCX ici ou cliquez",
    importFormats:"Formats : PDF, DOCX — ≤ 10 Mo", uploadedFiles:"Fichiers importés",
    analyze:"Analyser", orPaste:"Ou collez le texte du contrat", analyzeText:"Analyser le texte",
    localNote:"Cette V1 fonctionne 100% en local (aucune clé nécessaire).",
    analyzing:"Analyse en cours…", riskScore:"Score de risque", riskLevel:"Niveau de risque",
    sensitiveClauses:"Clauses problématiques", negotiationPoints:"Points de négociation (✍️ prêts à copier)",
    exportJson:"Exporter JSON", shareLink:"Partager via lien sécurisé", linkCopied:"Lien copié !",
    noneYet:"Importez un fichier ou collez du texte pour lancer l'analyse.",
    compareTitle:"Comparaison A/B", versionA:"Version A (original)", versionB:"Version B (modifiée)",
    launchCompare:"Lancer la comparaison", sideBySide:"Comparaison côte à côte", chooseTwo:"Choisissez deux fichiers pour voir les différences mot à mot.",
    qaTitle:"Questions sur le contrat", qaPlaceholder:"Posez n'importe quelle question (ex : durée, résiliation, responsabilité…)",
    qaSearch:"Chercher", clauseFound:"Clause trouvée :", summaryLabel:"Résumé", needAnalysis:"Analysez d'abord un contrat.",
    riskLow:"Faible", riskMed:"Moyen", riskHigh:"Élevé",
    glossaryTitle:"Explications simplifiées (termes juridiques)", noGlossary:"Aucun terme spécifique repéré.",
    light:"Clair", dark:"Sombre",
    signTitle:"Signature électronique (MVP local)", requestSign:"Demander une signature",
    signNow:"Signer maintenant", signerNamePh:"Nom du signataire", signerEmailPh:"Email du signataire",
    signatureCertified:"Signature numérique certifiée", signatureHistory:"Historique des signatures",
    shareSecure:"Partage sécurisé via lien",
  },
  en: {
    subtitle:"MVP • Analysis • Compare • Q&A • Signature",
    navAnalyze:"Analyze", navCompare:"Compare", navQA:"Q&A", navSign:"Signature",
    importTitle:"Import a contract", importHelp:"Drag a PDF/DOCX here or click",
    importFormats:"Formats: PDF, DOCX — ≤ 10 MB", uploadedFiles:"Uploaded files",
    analyze:"Analyze", orPaste:"Or paste contract text", analyzeText:"Analyze text",
    localNote:"This V1 runs 100% locally (no key required).",
    analyzing:"Analyzing…", riskScore:"Risk score", riskLevel:"Risk level",
    sensitiveClauses:"Problematic clauses", negotiationPoints:"Negotiation points (✍️ copy-ready)",
    exportJson:"Export JSON", shareLink:"Share via secure link", linkCopied:"Link copied!",
    noneYet:"Import a file or paste text to start.",
    compareTitle:"A/B Comparison", versionA:"Version A (original)", versionB:"Version B (modified)",
    launchCompare:"Run comparison", sideBySide:"Side-by-side", chooseTwo:"Choose two files to see word-level differences.",
    qaTitle:"Questions about the contract", qaPlaceholder:"Ask anything (e.g., term, termination, liability…)",
    qaSearch:"Search", clauseFound:"Clause found:", summaryLabel:"Summary", needAnalysis:"Analyze a contract first.",
    riskLow:"Low", riskMed:"Medium", riskHigh:"High",
    glossaryTitle:"Plain-language explanations", noGlossary:"No specific terms detected.",
    light:"Light", dark:"Dark",
    signTitle:"E-signature (local MVP)", requestSign:"Request signature",
    signNow:"Sign now", signerNamePh:"Signer name", signerEmailPh:"Signer email",
    signatureCertified:"Certified digital signature", signatureHistory:"Signature history",
    shareSecure:"Secure share link",
  }
};
type Lang = keyof typeof tdict;

// ---------- Glossary ----------
const LEGAL_TERMS = [
  { k:/résiliation|termination/i, fr:"Fin anticipée du contrat.", en:"Early ending of the contract." },
  { k:/responsabilit[eé]|liability/i, fr:"Limite qui paye en cas de problème.", en:"Limits who pays if something goes wrong." },
  { k:/indemn[iy]sation|hold\s*harmless/i, fr:"Une partie couvre les pertes de l'autre.", en:"One party covers the other's losses." },
  { k:/rgpd|gdpr|confidentialit[eé]|confidentiality/i, fr:"Règles sur données personnelles et secret.", en:"Personal data & confidentiality rules." },
  { k:/arbitrage|arbitration/i, fr:"Règlement privé des litiges.", en:"Private dispute resolution." },
];
function glossaryFor(text:string, lang:Lang){ 
  const out:{term:string,def:string}[]=[]; 
  for(const it of LEGAL_TERMS){ const m=text.match(it.k); if(m) out.push({term:m[0], def:(it as any)[lang]}); } 
  return out;
}

// ---------- Utils ----------
const prettyRisk=(r:Risk,t:any)=>r==="low"?t.riskLow:r==="medium"?t.riskMed:t.riskHigh;
const riskPill=(r:Risk)=>r==="low"?"text-emerald-600 bg-emerald-50 border-emerald-200":r==="medium"?"text-amber-600 bg-amber-50 border-amber-200":"text-red-600 bg-red-50 border-red-200";
const riskIcon=(r:Risk)=>r==="low"?<CheckCircle className="w-4 h-4"/>:r==="medium"?<AlertCircle className="w-4 h-4"/>:<AlertTriangle className="w-4 h-4"/>;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const hashLite=(s:string)=>{ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return ("00000000"+(h>>>0).toString(16)).slice(-8) }

// ---------- PDF/DOCX -> texte ----------
async function extractTextFromFile(file: File): Promise<string> {
  if (file.type==="application/pdf"||file.name.endsWith(".pdf")){
    const pdfjs=await import("pdfjs-dist");
    // @ts-ignore
    const workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjs as any).version}/pdf.worker.min.js`;
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
    // @ts-ignore
    const loadingTask=pdfjs.getDocument({data:await file.arrayBuffer()});
    const pdf=await loadingTask.promise; let full="";
    for(let p=1;p<=pdf.numPages;p++){ const page=await pdf.getPage(p); const content=await page.getTextContent(); full+="\n"+content.items.map((i:any)=>i.str||"").join(" "); }
    return full;
  }
  if (file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"||file.name.endsWith(".docx")){
    const mammoth=await import("mammoth/mammoth.browser");
    const ab=await file.arrayBuffer(); const res=await mammoth.extractRawText({arrayBuffer:ab}); return res.value||"";
  }
  return await file.text();
}

// ---------- Analyse heuristique locale ----------
function analyzeTextLocally(raw:string):Omit<AnalysisResult,"analyzedAt">{
  const text=raw.replace(/\s+/g," ").trim();
  const rules:{name:string;pattern:RegExp;risk:Risk;issue:string;suggestion:string}[]=[
    { name:"Résiliation unilatérale", pattern:/(résiliation|termination).*?(unilat|sans\s+préavis|without\s+notice)/i, risk:"high", issue:"Résiliation possible par une seule partie, parfois sans préavis.", suggestion:"Exiger un préavis écrit de 30 jours minimum et motif légitime." },
    { name:"Limitation de responsabilité étendue", pattern:/(limitation|responsabilit[eé]|liability).*(illimit|toutes\s+causes|any\s+cause)/i, risk:"medium", issue:"Limite la responsabilité pour toute cause.", suggestion:"Exclure la négligence grave/dolosive et prévoir un plafond raisonnable." },
    { name:"Indemnisation à sens unique", pattern:/(indemn[iy]sation|hold\s+harmless).*(uniquement|one\s+way|b[eé]n[eé]fice\s+de)/i, risk:"medium", issue:"L'indemnisation ne bénéficie qu'à une partie.", suggestion:"Rendre l'indemnisation réciproque, proportionnée au risque." },
    { name:"Renouvellement automatique", pattern:/(renouvellement\s+automatique|auto\s*renew|tacite\s+reconduction)/i, risk:"low", issue:"Reconduction sans action explicite.", suggestion:"Notification 30 jours avant + possibilité d'opposition simple." },
    { name:"Données/Confidentialité", pattern:/(donn[eé]es|RGPD|GDPR|confidentialit[eé]|confidentiality)/i, risk:"medium", issue:"Mentions sensibles à cadrer.", suggestion:"Ajouter DPA RGPD, finalités, sous-traitants, mesures de sécurité." },
  ];
  const found:ClauseIssue[]=[]; for(const r of rules){ const m=text.match(r.pattern); if(m) found.push({clause:r.name,risk:r.risk,issue:r.issue,suggestion:r.suggestion}) }
  let score=30; const w={low:8,medium:15,high:25}; for(const f of found){ score+= (w as any)[f.risk] }
  score=Math.max(0,Math.min(100,score)); const riskLevel:Risk=score>=70?"high":score>=45?"medium":"low";
  const negotiationPoints:NegotiationPoint[]=found.map(f=>({ point:f.clause, priority:f.risk==="high"?"high":f.risk==="medium"?"medium":"low",
    alternative: f.clause==="Résiliation unilatérale" ? "Toute résiliation requiert un préavis écrit de trente (30) jours, motivé."
    : f.clause==="Limitation de responsabilité étendue" ? "La responsabilité est limitée aux dommages directs ; la négligence grave reste exclue de toute limitation."
    : f.clause==="Indemnisation à sens unique" ? "Les obligations d'indemnisation sont réciproques et proportionnées aux risques respectifs."
    : f.clause==="Renouvellement automatique" ? "Le renouvellement nécessite une notification reçue 30 jours avant l'échéance."
    : "Les traitements de données sont régis par un DPA conforme au RGPD, précisant finalités et mesures de sécurité."
  }));
  const summary = found.length===0 ? "Aucun risque majeur détecté par les règles de base. Vérifier clauses financières et PI."
    : `${found.length} clause(s) sensible(s) détectée(s). Focus : ${found.slice(0,2).map(c=>c.clause).join(", ")}${found.length>2?" …":""}`;
  return { globalScore:score, riskLevel, problematicClauses:found, negotiationPoints, summary, sourceText:text };
}

// ---------- Diff mot-à-mot ----------
async function makeDiffHTML(fileA:File, fileB:File){
  const [a,b]=await Promise.all([extractTextFromFile(fileA), extractTextFromFile(fileB)]);
  const A=a.split(/\s+/), B=b.split(/\s+/);
  const dp=Array(A.length+1).fill(0).map(()=>Array(B.length+1).fill(0));
  for(let i=1;i<=A.length;i++){ for(let j=1;j<=B.length;j++){ dp[i][j]=A[i-1]===B[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]) } }
  const out:string[]=[]; let i=A.length,j=B.length;
  while(i>0 && j>0){
    if(A[i-1]===B[j-1]){ out.unshift(`<span>${esc(A[i-1])}</span>`); i--; j--; }
    else if(dp[i-1][j]>=dp[i][j-1]){ out.unshift(`<del class="bg-red-500/20 text-red-200 px-1 rounded">${esc(A[i-1])}</del>`); i--; }
    else { out.unshift(`<ins class="bg-emerald-500/20 text-emerald-200 px-1 rounded">${esc(B[j-1])}</ins>`); j--; }
  }
  while(i-- >0) out.unshift(`<del class="bg-red-500/20 text-red-200 px-1 rounded">${esc(A[i+1])}</del>`)
  while(j-- >0) out.unshift(`<ins class="bg-emerald-500/20 text-emerald-200 px-1 rounded">${esc(B[j+1])}</ins>`)
  return out.join(" ");
}

// ---------- Q&A local ----------
function qaFind(text:string, question:string, t:any){
  if(!text) return [{clause:"—", summary:t.noneYet}];
  const q=question.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  const hits:{clause:string, summary:string}[]=[];
  for(const k of q){
    const re=new RegExp(`.{0,60}(${k}.{0,120})`,"gi"); let m;
    while((m=re.exec(text))!==null){ hits.push({clause:m[1], summary:`${t.clauseFound} « ${k} »`}) }
  }
  return hits.length?hits:[{clause:"—", summary:"Aucune clause correspondante trouvée."}];
}

// ---------- Jauge ----------
function Gauge({value}:{value:number}){
  const r=52, C=2*Math.PI*r, off=C*(1-value/100);
  const color=value>70?"text-red-400":value>45?"text-amber-400":"text-emerald-400";
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-32 h-32 -rotate-90">
        <circle cx="64" cy="64" r={r} stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-700"/>
        <circle cx="64" cy="64" r={r} stroke="currentColor" strokeWidth="8" fill="none" className={color} strokeDasharray={C} strokeDashoffset={off} style={{filter:"drop-shadow(0 0 10px currentColor)", transition:"stroke-dashoffset .9s ease"}}/>
      </svg>
      <div className="absolute inset-0 grid place-items-center"><span className="text-4xl font-bold text-white">{value}</span></div>
    </div>
  )
}

// ===========================================================

export default function ContraScope(){
  const [lang,setLang]=useState<Lang>("fr");
  const t=tdict[lang];
  const [dark,setDark]=useState(true);
  const [tab,setTab]=useState<"analyze"|"compare"|"qa"|"sign">("analyze");

  // Analyze
  const [files,setFiles]=useState<File[]>([]);
  const [textInput,setTextInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<AnalysisResult|null>(null);

  // Compare
  const [fileA,setFileA]=useState<File|null>(null);
  const [fileB,setFileB]=useState<File|null>(null);
  const [diffHTML,setDiffHTML]=useState("");

  // Q&A
  const [question,setQuestion]=useState("");
  const [qa,setQa]=useState<{clause:string;summary:string}[]|null>(null);

  // Share
  const [copied,setCopied]=useState(false);

  // Signature
  const [sigName,setSigName]=useState("");
  const [sigEmail,setSigEmail]=useState("");
  const [sigHistory,setSigHistory]=useState<{id:string; at:string; signer:string; email:string}[]>([]);

  const dropRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{ const el=dropRef.current; if(!el) return;
    const prevent=(e:DragEvent)=>{e.preventDefault(); e.stopPropagation()};
    const onDrop=async(e:DragEvent)=>{prevent(e); if(!e.dataTransfer) return; handleFiles(Array.from(e.dataTransfer.files))}
    ["dragenter","dragover","dragleave","drop"].forEach(evt=>el.addEventListener(evt, prevent as any));
    el.addEventListener("drop", onDrop as any);
    return ()=>{ ["dragenter","dragover","dragleave","drop"].forEach(evt=>el.removeEventListener(evt, prevent as any)); el.removeEventListener("drop", onDrop as any) }
  },[]);

  const handleFiles=async(incoming:File[])=>{
    if(!incoming.length) return;
    setFiles(prev=>[...prev,...incoming]);
    await analyzeFile(incoming[0]);
  };

  const analyzeNow=async()=>{
    if(textInput.trim()){
      setBusy(true);
      const local=analyzeTextLocally(textInput);
      setResult({...local, analyzedAt:new Date().toISOString(), fileName:"Texte collé"});
      setBusy(false); return;
    }
    if(files[0]) await analyzeFile(files[0]);
  };

  const analyzeFile=async(file:File)=>{
    setBusy(true);
    let text=""; try{ text=await extractTextFromFile(file) } catch { alert("Impossible de lire ce fichier. Essayez un autre PDF/DOCX ou collez le texte."); setBusy(false); return; }
    const local=analyzeTextLocally(text);
    setResult({...local, analyzedAt:new Date().toISOString(), fileName:file.name, fileSize:file.size});
    setBusy(false);
  };

  const exportReport=()=>{
    if(!result) return;
    const data={ fileName:result.fileName, analyzedAt:result.analyzedAt, globalScore:result.globalScore, riskLevel:result.riskLevel, summary:result.summary, problematicClauses:result.problematicClauses, negotiationPoints:result.negotiationPoints };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`rapport-contrascope-${(result.fileName||"analyse").replace(/\s+/g,"-")}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const copyShare=()=>{
    if(!result) return;
    const payload=btoa(unescape(encodeURIComponent(JSON.stringify(result))));
    const url=`${location.origin}${location.pathname}?share=${payload}`;
    navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false),1500);
  };

  const runDiff=async()=>{
    if(!fileA||!fileB) return alert(t.chooseTwo);
    const html=await makeDiffHTML(fileA,fileB);
    setDiffHTML(html);
  };

  const onSearch=()=>{
    if(!result) { setQa([{clause:"—",summary:t.needAnalysis}]); return; }
    setQa(qaFind(result.sourceText, question, t));
  };

  const signNow=()=>{
    const at=new Date().toISOString();
    const base=(result?.fileName||"")+(result?.analyzedAt||"")+sigName+sigEmail+at;
    const id=hashLite(base);
    setSigHistory([{id, at, signer:sigName||"—", email:sigEmail||"—"}, ...sigHistory]);
    setSigName(""); setSigEmail("");
  };

  return (
    <div className={`${dark?"bg-slate-950 text-slate-100":"bg-white text-slate-900"} min-h-screen`}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/30 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500"><Brain className="w-6 h-6 text-white"/></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">ContraScope</h1>
              <p className="text-slate-300 text-sm">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setDark(!dark)} className="p-2 rounded-lg bg-white/5 border border-white/10">{dark?<Sun className="w-4 h-4"/>:<Moon className="w-4 h-4"/>}</button>
            <Languages className="w-4 h-4 text-slate-300"/>
            <select value={lang} onChange={(e)=>setLang(e.target.value as Lang)} className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-slate-100 text-sm">
              {Object.keys(tdict).map(k=><option value={k} key={k} className="bg-slate-900">{k.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-2 pb-3">
          <nav className="grid grid-cols-4 gap-2 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button onClick={()=>setTab("analyze")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${tab==="analyze"?"bg-gradient-to-r from-cyan-500 to-blue-500 text-white":"text-slate-300 hover:bg-white/10"}`}><Upload className="w-4 h-4"/> {t.navAnalyze}</button>
            <button onClick={()=>setTab("compare")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${tab==="compare"?"bg-gradient-to-r from-violet-500 to-purple-500 text-white":"text-slate-300 hover:bg-white/10"}`}><GitCompare className="w-4 h-4"/> {t.navCompare}</button>
            <button onClick={()=>setTab("qa")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${tab==="qa"?"bg-gradient-to-r from-emerald-500 to-teal-500 text-white":"text-slate-300 hover:bg-white/10"}`}><Search className="w-4 h-4"/> {t.navQA}</button>
            <button onClick={()=>setTab("sign")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${tab==="sign"?"bg-gradient-to-r from-orange-500 to-rose-500 text-white":"text-slate-300 hover:bg-white/10"}`}><PenTool className="w-4 h-4"/> {t.navSign}</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab==="analyze" && (
          <section className="grid lg:grid-cols-2 gap-8">
            {/* Upload + Coller */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-4"><Upload className="w-5 h-5"/> {t.importTitle}</h2>
              <div ref={dropRef} className="border-2 border-dashed border-purple-400/40 rounded-xl p-8 text-center hover:border-purple-400/70 transition cursor-pointer" onClick={()=>document.getElementById("file-input")?.click()}>
                <div className="w-fit mx-auto mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500"><FileText className="w-6 h-6 text-white"/></div>
                <p className="text-white font-semibold">{t.importHelp}</p>
                <p className="text-slate-300 text-sm">{t.importFormats}</p>
                <input id="file-input" type="file" accept=".pdf,.docx" multiple hidden onChange={(e)=>handleFiles(Array.from(e.target.files||[]))}/>
              </div>

              {files.length>0 && (
                <div className="mt-6">
                  <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> {t.uploadedFiles}</h3>
                  <div className="space-y-3">
                    {files.map((f,i)=>(
                      <div key={i} className="flex items-center justify-between bg-slate-900/60 border border-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500"><FileText className="w-4 h-4 text-white"/></div>
                          <div>
                            <p className="text-sm text-white font-medium">{f.name}</p>
                            <p className="text-xs text-slate-400">{(f.size/1024/1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold" onClick={()=>analyzeFile(f)} disabled={busy}>{busy?t.analyzing:t.analyze}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4"/> {t.orPaste}</h3>
                <textarea className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder={t.orPaste+"…"} value={textInput} onChange={(e)=>setTextInput(e.target.value)}/>
                <div className="flex justify-between mt-2 items-center">
                  <button onClick={analyzeNow} className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold" disabled={busy}>{busy?t.analyzing:t.analyzeText}</button>
                  <div className="text-xs text-slate-400 flex items-center gap-2"><Sparkles className="w-4 h-4"/><p>{t.localNote}</p></div>
                </div>
              </div>
            </div>

            {/* Résultats */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[28rem]">
              {busy ? (
                <div className="grid place-items-center h-full py-20">
                  <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"/>
                  <p className="mt-4 text-slate-300">{t.analyzing}</p>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500"><Star className="w-5 h-5 text-white"/></div>
                      <div>
                        <p className="text-white font-semibold">{t.riskScore}</p>
                        <p className="text-slate-300 text-sm">{result.fileName||"Texte"} • {new Date(result.analyzedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={exportReport} className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center gap-2"><Download className="w-4 h-4"/> {t.exportJson}</button>
                      <button onClick={copyShare} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold flex items-center gap-2 border border-white/10">
                        {copied ? <Check className="w-4 h-4"/> : <LinkIcon className="w-4 h-4"/>} {copied?t.linkCopied:t.shareLink}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center"><Gauge value={result.globalScore}/><p className="text-slate-300 text-sm mt-2">{t.riskScore}</p></div>
                    <div className="text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${riskPill(result.riskLevel)}`}>{riskIcon(result.riskLevel)}<span className="text-sm font-semibold">{prettyRisk(result.riskLevel,t)}</span></div>
                      <p className="text-slate-300 text-sm mt-2">{t.riskLevel}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white">{result.problematicClauses.length}</div>
                      <p className="text-slate-300 text-sm">{t.sensitiveClauses}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-yellow-300"/><p className="text-white font-semibold">{t.summaryLabel}</p></div>
                    <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {t.sensitiveClauses}</h3>
                    <div className="space-y-3">
                      {result.problematicClauses.map((c,idx)=>(
                        <div key={idx} className="bg-slate-900/40 border border-white/10 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <p className="text-white font-semibold">{c.clause}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskPill(c.risk)}`}>{prettyRisk(c.risk,t)}</span>
                          </div>
                          <p className="text-slate-300 text-sm mt-2">{c.issue}</p>
                          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 mt-3">
                            <p className="text-emerald-200 text-sm"><strong>💡 Suggestion :</strong> {c.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><PenTool className="w-4 h-4"/> {t.negotiationPoints}</h3>
                    <div className="space-y-3">
                      {result.negotiationPoints.map((p,idx)=>(
                        <div key={idx} className="bg-slate-900/40 border border-white/10 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <p className="text-white font-semibold">{p.point}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.priority==="high"?"bg-red-500 text-white":"bg-white/10 text-white"} border border-white/10`}>
                              {p.priority==="high"?t.riskHigh:p.priority==="medium"?t.riskMed:t.riskLow}
                            </span>
                          </div>
                          <div className="mt-2 bg-black/20 rounded p-3 text-emerald-100 text-sm flex justify-between items-center">
                            <span>“{p.alternative}”</span>
                            <button className="ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500" onClick={()=>navigator.clipboard.writeText(p.alternative)}>
                              <Copy className="w-3 h-3"/> Copier
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Glossary */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><BookOpenIcon/> {t.glossaryTitle}</h3>
                    <div className="space-y-2">
                      {glossaryFor(result.sourceText, lang).length ? glossaryFor(result.sourceText, lang).map((g,idx)=>(
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <p className="text-sm"><strong>{g.term}</strong> — {g.def}</p>
                        </div>
                      )) : <p className="text-slate-400 text-sm">{t.noGlossary}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid place-items-center h-full py-16 text-slate-300">{t.noneYet}</div>
              )}
            </div>
          </section>
        )}

        {tab==="compare" && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-6"><GitCompare className="w-5 h-5"/> {t.compareTitle}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm mb-2">{t.versionA}</p>
                <input type="file" accept=".pdf,.docx" onChange={(e)=>setFileA(e.target.files?.[0]||null)} />
              </div>
              <div>
                <p className="text-sm mb-2">{t.versionB}</p>
                <input type="file" accept=".pdf,.docx" onChange={(e)=>setFileB(e.target.files?.[0]||null)} />
              </div>
            </div>
            <div className="mt-6">
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold" onClick={runDiff}>{t.launchCompare}</button>
            </div>
            <div className="mt-6 p-4 bg-black/30 rounded-lg border border-white/10 min-h-[8rem] overflow-auto">
              {diffHTML ? <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html:diffHTML}}/> : <p className="text-slate-400 text-sm">{t.chooseTwo}</p>}
            </div>
          </section>
        )}

        {tab==="qa" && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-6"><Search className="w-5 h-5"/> {t.qaTitle}</h2>
            <div className="flex gap-2">
              <input className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder={t.qaPlaceholder} value={question} onChange={(e)=>setQuestion(e.target.value)}/>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold" onClick={onSearch}>{t.qaSearch}</button>
            </div>
            <div className="mt-6 space-y-3">
              {qa?.map((r,idx)=>(
                <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm text-emerald-300">{r.summary}</p>
                  <p className="text-slate-200 text-sm mt-1">{r.clause}</p>
                </div>
              ))}
              {!qa && <p className="text-slate-400 text-sm mt-2">{t.needAnalysis}</p>}
            </div>
          </section>
        )}

        {tab==="sign" && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-6"><PenTool className="w-5 h-5"/> {t.signTitle}</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder={t.signerNamePh} value={sigName} onChange={(e)=>setSigName(e.target.value)}/>
              <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder={t.signerEmailPh} value={sigEmail} onChange={(e)=>setSigEmail(e.target.value)}/>
              <button onClick={signNow} className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold">{t.signNow}</button>
            </div>

            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Lock className="w-4 h-4"/> {t.signatureCertified}</h3>
              <div className="space-y-2">
                {sigHistory.length? sigHistory.map((s,idx)=>(
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm"><strong>ID</strong> #{s.id}</p>
                      <p className="text-xs text-slate-400">{new Date(s.at).toLocaleString()}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{s.signer}</p>
                      <p className="text-slate-400">{s.email}</p>
                    </div>
                  </div>
                )) : <p className="text-slate-400 text-sm">{t.signatureHistory} — 0</p>}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

// Petit composant inline pour l’icône “book” (évite une lib en plus)
function BookOpenIcon(){ return (
  <svg width="16" height="16" viewBox="0 0 24 24" className="text-slate-200"><path fill="currentColor" d="M12 6c-1.657 0-3 .843-3 1.882V20c0-1.04 1.343-1.882 3-1.882s3 .842 3 1.882V7.882C15 6.843 13.657 6 12 6m9 0c-2.761 0-5 1.567-5 3.5V22h2v-1.5c0-.828.895-1.5 2-1.5s2 .672 2 1.5V22h2V9.5C24 7.567 21.761 6 19 6M0 9.5V22h2v-1.5c0-.828.895-1.5 2-1.5s2 .672 2 1.5V22h2V9.5C8 7.567 5.761 6 3 6S0 7.567 0 9.5"/></svg>
)}
