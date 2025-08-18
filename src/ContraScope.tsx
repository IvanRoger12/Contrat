import React, { useEffect, useState, useMemo } from "react";
import { Upload, Search, FileText, Edit3 } from "lucide-react";

// Types
type Tab = "analyze" | "compare" | "qa" | "sign";
type Risk = "low" | "medium" | "high";

interface ClauseIssue { 
  clause: string; 
  risk: Risk; 
  issue: string; 
  suggestion: string 
}

interface NegotiationPoint { 
  point: string; 
  priority: "low" | "medium" | "high"; 
  alternative: string 
}

interface AnalysisResult {
  fileName?: string;
  fileSize?: number;
  analyzedAt: string;
  globalScore: number;
  riskLevel: Risk;
  problematicClauses: ClauseIssue[];
  negotiationPoints: NegotiationPoint[];
  summary: string;
  sourceText: string;
}

// Utils
const riskPill = (r: Risk) =>
  r === "low" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
  r === "medium" ? "text-amber-600 bg-amber-50 border-amber-200" :
  "text-red-600 bg-red-50 border-red-200";

const esc = (s: string) => s.replace(/[&<>"']/g, c => 
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));

const hashLite = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
};

// File processing
async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("File too large (max 10MB)"));
      return;
    }

    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      reject(new Error("Unsupported file type (only PDF/DOCX allowed)"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // Simulated text extraction - in a real app you would use a library like pdf-parse or mammoth
      resolve(`CONTRACT EXTRACTED TEXT\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB`);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// Analysis logic
function analyzeTextLocally(raw: string): Omit<AnalysisResult, "analyzedAt"> {
  const text = raw.replace(/\s+/g, " ").trim();
  
  const rules = [
    { 
      name: "Unilateral Termination", 
      pattern: /(résiliation|termination).*?(unilat|sans\s+préavis|without\s+notice)/i, 
      risk: "high" as const,
      issue: "Termination possible by one party only, sometimes without notice.",
      suggestion: "Require minimum 30 days written notice and legitimate reason."
    },
    // Add more rules as needed...
  ];

  const found: ClauseIssue[] = [];
  for (const r of rules) {
    if (text.match(r.pattern)) {
      found.push({
        clause: r.name,
        risk: r.risk,
        issue: r.issue,
        suggestion: r.suggestion
      });
    }
  }

  const score = Math.min(100, 30 + found.reduce((sum, f) => sum + 
    (f.risk === "high" ? 25 : f.risk === "medium" ? 15 : 8), 0));

  const riskLevel: Risk = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

  const negotiationPoints: NegotiationPoint[] = found.map(f => ({
    point: f.clause,
    priority: f.risk,
    alternative: f.suggestion
  }));

  const summary = found.length === 0
    ? "No major risks detected by basic rules. Check financial and IP clauses."
    : `${found.length} sensitive clause(s) detected. Focus: ${found.slice(0, 2).map(c => c.clause).join(", ")}${found.length > 2 ? "…" : ""}`;

  return { 
    globalScore: score, 
    riskLevel, 
    problematicClauses: found, 
    negotiationPoints, 
    summary, 
    sourceText: text 
  };
}

// Translation system
const useTranslations = (language: string) => {
  return useMemo(() => {
    const translations = {
      FR: {
        title: "ContraScope",
        analyze: "Analyser",
        // Add all other FR translations...
      },
      EN: {
        title: "ContraScope",
        analyze: "Analyze",
        // Add all other EN translations...
      },
      // Add other languages as needed...
    };

    return translations[language as keyof typeof translations] || translations.EN;
  }, [language]);
};

// Main Component
export default function ContraScope() {
  const [dark, setDark] = useState(true);
  const [language, setLanguage] = useState("EN");
  const [tab, setTab] = useState<Tab>("analyze");
  const t = useTranslations(language);

  // State management
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compare state
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [diffHTML, setDiffHTML] = useState("");

  // QA state
  const [question, setQuestion] = useState("");
  const [qaResults, setQaResults] = useState<{clause: string; summary: string}[]>([]);

  // Signature state
  const [signature, setSignature] = useState({
    name: "",
    email: ""
  });
  const [signatureHistory, setSignatureHistory] = useState<
    {id: string; date: string; signer: string; email: string}[]
  >([]);

  // Dark mode effect
  useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.remove("light");
      html.style.colorScheme = "dark";
    } else {
      html.classList.add("light");
      html.style.colorScheme = "light";
    }
  }, [dark]);

  // File handling
  const handleFileUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    
    try {
      const text = await extractTextFromFile(file);
      const analysis = analyzeTextLocally(text);
      
      setResult({
        ...analysis,
        analyzedAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setBusy(false);
    }
  };

  // Signature handler
  const handleSign = () => {
    const newSignature = {
      id: hashLite(`${Date.now()}${signature.name}${signature.email}`),
      date: new Date().toISOString(),
      signer: signature.name,
      email: signature.email
    };
    
    setSignatureHistory(prev => [newSignature, ...prev]);
    setSignature({ name: "", email: "" });
  };

  // Render
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      dark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" 
           : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      {/* Header */}
      <header className={`backdrop-blur-sm border-b transition-colors duration-300 ${
        dark ? "bg-slate-800/80 border-slate-700/50" 
             : "bg-white/80 border-gray-200/50"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                  Contra<span className="text-cyan-400">Scope</span>
                </h1>
                <p className={`text-sm ${dark ? "text-slate-400" : "text-gray-600"}`}>
                  {t.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDark(!dark)}
                className={`p-2 rounded-lg transition-colors ${
                  dark ? "bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white" 
                       : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                }`}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? "☀️" : "🌙"}
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`border rounded-lg px-3 py-1 text-sm transition-colors ${
                  dark ? "bg-slate-700/50 border-slate-600 text-slate-200" 
                       : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                <option value="EN">🇬🇧 English</option>
                <option value="FR">🇫🇷 Français</option>
                {/* Add other language options */}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`backdrop-blur-sm border-b transition-colors duration-300 ${
        dark ? "bg-slate-800/60 border-slate-700/30" 
             : "bg-white/60 border-gray-200/30"
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-3 overflow-x-auto">
            {(["analyze", "compare", "qa", "sign"] as Tab[]).map((tabName) => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  tab === tabName
                    ? `bg-gradient-to-r ${
                        tabName === "analyze" ? "from-cyan-500 to-blue-500 shadow-cyan-500/25" :
                        tabName === "compare" ? "from-violet-500 to-purple-500 shadow-violet-500/25" :
                        tabName === "qa" ? "from-emerald-500 to-teal-500 shadow-emerald-500/25" :
                        "from-orange-500 to-rose-500 shadow-orange-500/25"
                      } text-white shadow-lg`
                    : dark
                      ? "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                      : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900"
                }`}
              >
                {tabName === "analyze" && <Upload className="w-4 h-4" />}
                {tabName === "compare" && <FileText className="w-4 h-4" />}
                {tabName === "qa" && <Search className="w-4 h-4" />}
                {tabName === "sign" && <Edit3 className="w-4 h-4" />}
                {t[tabName]}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className={`mb-6 p-4 rounded-xl border ${
            dark ? "bg-red-900/30 border-red-700/50 text-red-200" 
                 : "bg-red-100/50 border-red-200/50 text-red-800"
          }`}>
            {error}
          </div>
        )}

        {tab === "analyze" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload section */}
            <div className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-500/50 transition-all group ${
                  dark ? "border-slate-600/50 hover:bg-slate-800/30" 
                       : "border-gray-300/50 hover:bg-gray-50/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
                  {t.dragDrop}
                </h3>
                <p className={`${dark ? "text-slate-400" : "text-gray-600"}`}>
                  {t.formats}
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                dark ? "bg-slate-800/50 border-slate-700/50" 
                     : "bg-white/70 border-gray-200/50"
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className={`w-5 h-5 ${dark ? "text-slate-400" : "text-gray-500"}`} />
                  <label className={`font-medium ${dark ? "text-slate-300" : "text-gray-700"}`}>
                    {t.pasteText}
                  </label>
                </div>
                <textarea
                  className={`w-full h-40 border rounded-xl px-4 py-3 placeholder-opacity-60 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all resize-none ${
                    dark ? "bg-slate-900/50 border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                         : "bg-gray-50/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-cyan-500"
                  }`}
                  placeholder={`${t.pasteText}...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (textInput.trim()) {
                      setBusy(true);
                      setTimeout(() => {
                        const analysis = analyzeTextLocally(textInput);
                        setResult({
                          ...analysis,
                          analyzedAt: new Date().toISOString(),
                          fileName: "Pasted text"
                        });
                        setBusy(false);
                      }, 500);
                    }
                  }}
                  disabled={busy || !textInput.trim()}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? t.analyzing : t.analyzeBtn}
                </button>
              </div>
            </div>

            {/* Results section */}
            <div>
              {busy ? (
                <div className={`backdrop-blur-sm rounded-2xl p-8 border text-center transition-colors ${
                  dark ? "bg-slate-800/50 border-slate-700/50" 
                       : "bg-white/70 border-gray-200/50"
                }`}>
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className={`${dark ? "text-slate-300" : "text-gray-700"}`}>
                    {t.analyzing}
                  </p>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  {/* Result summary card */}
                  <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                    dark ? "bg-slate-800/50 border-slate-700/50" 
                         : "bg-white/70 border-gray-200/50"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className={`text-sm ${dark ? "text-slate-400" : "text-gray-600"}`}>
                          {result.fileName || "Text"}
                        </p>
                        <p className={`text-xs ${dark ? "text-slate-500" : "text-gray-500"}`}>
                          {new Date(result.analyzedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${riskPill(result.riskLevel)}`}>
                          {result.riskLevel === "high" ? "High" : 
                           result.riskLevel === "medium" ? "Medium" : "Low"}
                        </div>
                        <div className={`text-2xl font-bold mt-1 ${dark ? "text-white" : "text-gray-900"}`}>
                          {result.globalScore}/100
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-xl p-4 transition-colors ${
                      dark ? "bg-slate-900/50 border-slate-600/30" 
                           : "bg-gray-50/50 border-gray-200/30"
                    }`}>
                      <h4 className={`font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
                        {t.summary}
                      </h4>
                      <p className={`text-sm ${dark ? "text-slate-300" : "text-gray-700"}`}>
                        {result.summary}
                      </p>
                    </div>
                  </div>

                  {/* Problematic clauses */}
                  {result.problematicClauses.length > 0 && (
                    <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                      dark ? "bg-slate-800/50 border-slate-700/50" 
                           : "bg-white/70 border-gray-200/50"
                    }`}>
                      <h3 className={`font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
                        {t.problematicClauses}
                      </h3>
                      <div className="space-y-4">
                        {result.problematicClauses.map((clause, i) => (
                          <div 
                            key={i}
                            className={`rounded-xl p-4 border transition-colors ${
                              dark ? "bg-slate-900/50 border-slate-600/30" 
                                   : "bg-gray-50/50 border-gray-200/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`${dark ? "text-white" : "text-gray-900"}`}>
                                {clause.clause}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${riskPill(clause.risk)}`}>
                                {clause.risk === "high" ? "High" : 
                                 clause.risk === "medium" ? "Medium" : "Low"}
                              </span>
                            </div>
                            <p className={`text-sm mb-3 ${dark ? "text-slate-300" : "text-gray-700"}`}>
                              {clause.issue}
                            </p>
                            <div className={`rounded-lg p-3 border ${
                              dark ? "bg-emerald-500/10 border-emerald-500/20" 
                                   : "bg-emerald-100/50 border-emerald-200/50"
                            }`}>
                              <p className={`text-sm ${dark ? "text-emerald-200" : "text-emerald-800"}`}>
                                <span className="font-medium">💡 Suggestion:</span> {clause.suggestion}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Negotiation points */}
                  {result.negotiationPoints.length > 0 && (
                    <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors ${
                      dark ? "bg-slate-800/50 border-slate-700/50" 
                           : "bg-white/70 border-gray-200/50"
                    }`}>
                      <h3 className={`font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
                        {t.negotiationPoints}
                      </h3>
                      <div className="space-y-3">
                        {result.negotiationPoints.map((point, i) => (
                          <div 
                            key={i}
                            className={`rounded-xl p-4 border transition-colors ${
                              dark ? "bg-slate-900/50 border-slate-600/30" 
                                   : "bg-gray-50/50 border-gray-200/30"
                            }`}
                          >
                            <h4 className={`${dark ? "text-white" : "text-gray-900"}`}>
                              {point.point}
                            </h4>
                            <div className={`rounded-lg p-3 border ${
                              dark ? "bg-blue-500/10 border-blue-500/20" 
                                   : "bg-blue-100/50 border-blue-200/50"
                            }`}>
                              <p className={`text-sm ${dark ? "text-blue-200" : "text-blue-800"}`}>
                                "{point.alternative}"
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`backdrop-blur-sm rounded-2xl p-8 border text-center transition-colors ${
                  dark ? "bg-slate-800/50 border-slate-700/50" 
                       : "bg-white/70 border-gray-200/50"
                }`}>
                  <FileText className={`w-16 h-16 mx-auto mb-4 ${dark ? "text-slate-500" : "text-gray-400"}`} />
                  <p className={`${dark ? "text-slate-300" : "text-gray-700"}`}>
                    Upload a file or paste text to start analysis
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other tabs (compare, qa, sign) would be implemented similarly */}
        {tab === "compare" && (
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-2xl font-bold mb-6 ${dark ? "text-white" : "text-gray-900"}`}>
              {t.compareTitle}
            </h2>
            {/* Compare implementation */}
          </div>
        )}

        {tab === "qa" && (
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-2xl font-bold mb-6 ${dark ? "text-white" : "text-gray-900"}`}>
              {t.qaTitle}
            </h2>
            {/* Q&A implementation */}
          </div>
        )}

        {tab === "sign" && (
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-2xl font-bold mb-6 ${dark ? "text-white" : "text-gray-900"}`}>
              {t.signTitle}
            </h2>
            {/* Signature implementation */}
          </div>
        )}
      </main>
    </div>
  );
}
