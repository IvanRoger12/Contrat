import React, { useEffect, useState } from "react";

type Tab = "analyze" | "compare" | "qa" | "sign";
type Risk = "low" | "medium" | "high";

interface ClauseIssue { clause:string; risk:Risk; issue:string; suggestion:string }
interface NegotiationPoint { point:string; priority:"low"|"medium"|"high"; alternative:string }
interface AnalysisResult {
  fileName?:string; fileSize?:number; analyzedAt:string;
  globalScore:number; riskLevel:Risk; problematicClauses:ClauseIssue[];
  negotiationPoints:NegotiationPoint[]; summary:string; sourceText:string;
}

/* ---------- utils ---------- */
const prettyRisk = (r: Risk) => (r==="low"?"Faible":r==="medium"?"Moyen":"Élevé");
const riskPill = (r: Risk) =>
  r==="low"?"text-emerald-600 bg-emerald-50 border-emerald-200":
  r==="medium"?"text-amber-600 bg-amber-50 border-amber-200":
  "text-red-600 bg-red-50 border-red-200";
const esc = (s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const hashLite=(s:string)=>{ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return ("00000000"+(h>>>0).toString(16)).slice(-8) }

/* ---------- PDF/DOCX -> texte (pdfjs-dist v3) ---------- */
async function extractTextFromFile(file: File): Promise<string> {
  if (file.type==="application/pdf"||file.name.endsWith(".pdf")){
    const pdfjs:any = await import("pdfjs-dist");
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pdf = await loadingTask.promise; let all = "";
    for (let p=1; p<=pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      all += "\n" + content.items.map((i:any)=>i.str||"").join(" ");
    }
    return all;
  }
  if (file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"||file.name.endsWith(".docx")){
    const mammoth:any = await import("mammoth/mammoth.browser");
    const ab = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: ab });
    return res.value || "";
  }
  return await file.text();
}

/* ---------- Analyse heuristique locale ---------- */
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

/* ---------- Diff mot-à-mot ---------- */
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

/* ---------- Q&A local ---------- */
function qaFind(text:string, question:string){
  if(!text) return [{clause:"—", summary:"Analysez d'abord un contrat."}];
  const q=question.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  const hits:{clause:string,summary:string}[]=[];
  for(const k of q){
    const re=new RegExp(`.{0,60}(${k}.{0,120})`,"gi"); let m;
    while((m=re.exec(text))!==null){ hits.push({clause:m[1], summary:`Clause trouvée : « ${k} »`}) }
  }
  return hits.length?hits:[{clause:"—", summary:"Aucune clause correspondante trouvée."}];
}

/* ---------- UI ---------- */

export default function ContraScope() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("analyze");

  // mode clair lisible
  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.classList.remove("light");
    else html.classList.add("light");
  }, [dark]);

  // analyze state
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // compare state
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [diffHTML, setDiffHTML] = useState("");

  // qa state
  const [question, setQuestion] = useState("");
  const [qa, setQa] = useState<{clause:string;summary:string}[]|null>(null);

  // sign state
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
      setResult({ ...local, analyzedAt: new Date().toISOString(), fileName: "Texte collé" });
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
      alert("Impossible de lire ce fichier. Essayez un autre PDF/DOCX ou collez le texte.");
    } finally {
      setBusy(false);
    }
  };

  const runDiff = async () => {
    if (!fileA || !fileB) return alert("Choisissez deux fichiers pour voir les différences.");
    const html = await makeDiffHTML(fileA, fileB);
    setDiffHTML(html);
  };

  const onSearch = () => {
    if (!result) { setQa([{clause:"—",summary:"Analysez d'abord un contrat."}]); return; }
    setQa(qaFind(result.sourceText, question));
  };

  const signNow = () => {
    const at = new Date().toISOString();
    const id = hashLite((result?.fileName||"")+(result?.analyzedAt||"")+sigName+sigEmail+at);
    setSigHistory([{id, at, signer:sigName||"—", email:sigEmail||"—"}, ...sigHistory]);
    setSigName(""); setSigEmail("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1220] text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur">
        <div>
          <h1 className="text-2xl font-bold">
            Contra<span className="text-sky-400">Scope</span>
          </h1>
          <p className="text-slate-300 text-sm">MVP • Analyse • Comparaison • Q&A • Signature</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setDark((d) => !d)}
            className="px-3 py-1 rounded-md bg-white/10 text-sm text-white hover:bg-white/20"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
          <select className="bg-black/30 text-white text-sm rounded-md px-2 py-1">
            <option>FR</option>
            <option>EN</option>
          </select>
        </div>
      </header>

      {/* NAV TABS */}
      <nav className="flex gap-6 px-6 py-3 border-b border-white/10 text-white/80 text-sm">
        <button
          onClick={() => setTab("analyze")}
          className={`px-5 py-2 rounded-md ${tab === "analyze" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
        >
          Analyser
        </button>
        <button
          onClick={() => setTab("compare")}
          className={`px-5 py-2 rounded-md ${tab === "compare" ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
        >
          Comparer
        </button>
        <button
          onClick={() => setTab("qa")}
          className={`px-5 py-2 rounded-md ${tab === "qa" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
        >
          Q&A
        </button>
        <button
          onClick={() => setTab("sign")}
          className={`px-5 py-2 rounded-md ${tab === "sign" ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
        >
          Signature
        </button>
      </nav>

      {/* MAIN */}
      <main className="flex-1">
        {tab === "analyze" && (
          <section className="grid lg:grid-cols-2 gap-6 p-6">
            {/* Col gauche : upload & coller */}
            <div className="border-r border-white/10 pr-6">
              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <div className="text-pink-400 text-4xl mb-2">📄</div>
                <p className="text-white font-medium">Glissez un PDF/DOCX ici ou cliquez</p>
                <p className="text-slate-400 text-sm mt-1">Formats : PDF, DOCX — ≤ 10 Mo</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  hidden
                  onChange={(e)=>handleFiles(Array.from(e.target.files||[]))}
                />
              </div>

              <div className="mt-4">
                <label className="text-slate-400 text-sm">Ou collez le texte du contrat</label>
                <textarea
                  className="w-full h-40 mt-2 p-3 rounded-lg bg-white/5 text-white border border-white/10"
                  placeholder="Ou collez le texte du contrat..."
                  value={textInput}
                  onChange={(e)=>setTextInput(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <button onClick={analyzeNow} className="px-5 py-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold">
                  Analyser
                </button>
              </div>
            </div>

            {/* Col droite : résultats */}
            <div className="pl-6">
              {busy ? (
                <p className="text-slate-300">Analyse en cours…</p>
              ) : result ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm">{result.fileName || "Texte"} • {new Date(result.analyzedAt).toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${riskPill(result.riskLevel)}`}>
                        <span className="text-sm font-semibold">{prettyRisk(result.riskLevel)}</span>
                      </div>
                      <div className="text-lg font-bold">{result.globalScore}</div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-white font-semibold">Résumé</p>
                    <p className="text-slate-200 text-sm mt-1">{result.summary}</p>
                  </div>

                  <div>
                    <p className="text-white font-semibold mb-2">Clauses problématiques</p>
                    <div className="space-y-2">
                      {result.problematicClauses.map((c, i)=>(
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">{c.clause}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${riskPill(c.risk)}`}>{prettyRisk(c.risk)}</span>
                          </div>
                          <p className="text-slate-300 text-sm mt-1">{c.issue}</p>
                          <div className="mt-2 bg-emerald-500/15 border border-emerald-500/30 rounded p-2 text-emerald-100 text-sm">
                            💡 Suggestion : {c.suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white font-semibold mb-2">Points de négociation</p>
                    <div className="space-y-2">
                      {result.negotiationPoints.map((p,i)=>(
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <p className="text-white font-medium">{p.point}</p>
                          <div className="mt-2 bg-black/20 rounded p-2 text-emerald-100 text-sm">
                            “{p.alternative}”
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300">Importez un fichier ou collez du texte pour lancer l'analyse.</p>
              )}
            </div>
          </section>
        )}

        {tab === "compare" && (
          <section className="p-6">
            <h2 className="text-white font-semibold mb-4">Comparaison A/B</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-300 mb-2">Version A (original)</p>
                <input className="block w-full text-sm" type="file" accept=".pdf,.docx" onChange={(e)=>setFileA(e.target.files?.[0]||null)} />
              </div>
              <div>
                <p className="text-sm text-slate-300 mb-2">Version B (modifiée)</p>
                <input className="block w-full text-sm" type="file" accept=".pdf,.docx" onChange={(e)=>setFileB(e.target.files?.[0]||null)} />
              </div>
            </div>
            <button className="mt-6 px-5 py-2 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold" onClick={runDiff}>
              Lancer la comparaison
            </button>
            <div className="mt-6 p-4 bg-black/30 rounded-lg border border-white/10 min-h-[8rem] overflow-auto">
              {diffHTML
                ? <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html:diffHTML}} />
                : <p className="text-slate-400 text-sm">Le résultat de la comparaison s’affichera ici.</p>}
            </div>
          </section>
        )}

        {tab === "qa" && (
          <section className="p-6">
            <h2 className="text-white font-semibold mb-4">Questions sur le contrat</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="Posez n'importe quelle question (ex : durée, résiliation, responsabilité…)"
                value={question}
                onChange={(e)=>setQuestion(e.target.value)}
              />
              <button className="px-5 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold" onClick={onSearch}>
                Chercher
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {qa?.map((r,idx)=>(
                <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-emerald-300 text-sm">{r.summary}</p>
                  <p className="text-slate-200 text-sm mt-1">{r.clause}</p>
                </div>
              )) || <p className="text-slate-400 text-sm mt-2">Analysez d'abord un contrat.</p>}
            </div>
          </section>
        )}

        {tab === "sign" && (
          <section className="p-6">
            <h2 className="text-white font-semibold mb-4">Signature Électronique</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Nom du signataire" value={sigName} onChange={(e)=>setSigName(e.target.value)} />
              <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Email du signataire" value={sigEmail} onChange={(e)=>setSigEmail(e.target.value)} />
              <button className="px-5 py-2 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold" onClick={signNow}>
                Signer maintenant
              </button>
            </div>

            <div className="mt-6">
              <p className="text-slate-300 text-sm">Historique des signatures</p>
              <div className="mt-2 space-y-2">
                {sigHistory.length ? sigHistory.map((s,idx)=>(
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
                )) : <div className="bg-white/5 border border-white/10 rounded-lg p-3"><p className="text-slate-400 text-sm">Aucune signature enregistrée.</p></div>}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
