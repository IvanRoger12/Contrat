import React, { useEffect, useState } from "react";
import { Upload, Search, FileText, Edit3 } from "lucide-react";

/* Types */
type Tab = "analyze" | "compare" | "qa" | "sign";
type Risk = "low" | "medium" | "high";

interface ClauseIssue { clause: string; risk: Risk; issue: string; suggestion: string }
interface NegotiationPoint { point: string; priority: "low" | "medium" | "high"; alternative: string }
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

/* i18n (FR / EN) */
const I18N = {
  FR: {
    appTitle: "ContraScope",
    appSubtitle: "MVP • Analyse • Comparaison • Q&A • Signature",
    themeLight: "☀️",
    themeDark: "🌙",
    tabAnalyze: "Analyser",
    tabCompare: "Comparer",
    tabQA: "Q&A",
    tabSign: "Signature",
    dragDrop: "Glissez un PDF/DOCX ici ou cliquez",
    formats: "Formats : PDF, DOCX — <= 10 Mo",
    pasteText: "Ou collez le texte du contrat",
    analyzeBtn: "Analyser",
    analyzing: "Analyse en cours...",
    analyzeHint: "Importez un fichier ou collez du texte pour lancer l'analyse.",
    riskLow: "Faible",
    riskMed: "Moyen",
    riskHigh: "Eleve",
    summary: "Resume",
    probClauses: "Clauses problematiques",
    negoPoints: "Points de negociation",
    compareTitle: "Comparaison A/B",
    compareDesc: "Comparez deux versions d'un contrat pour identifier les modifications",
    versionA: "Version A (original)",
    versionB: "Version B (modifiee)",
    launchComparison: "Lancer la comparaison",
    compareEmpty: "Le resultat s'affichera ici apres selection de deux fichiers.",
    qaTitle: "Questions sur le contrat",
    qaDesc: "Posez des questions sur le contrat analyse",
    qaPlaceholder: "Posez une question (ex : duree, resiliation, responsabilite...)",
    search: "Chercher",
    results: "Resultats",
    qaAnalyzeFirst: "Analysez un contrat d'abord.",
    qaNone: "Aucune clause correspondante trouvee.",
    qaFound: (k: string) => `Clause trouvee : « ${k} »`,
    signTitle: "Signature Electronique",
    signDesc: "Signez electroniquement vos contrats",
    newSignature: "Nouvelle signature",
    signerName: "Nom du signataire",
    signerEmail: "Email du signataire",
    signNow: "Signer maintenant",
    signHistory: "Historique des signatures",
    noSignatures: "Aucune signature enregistree.",
    alertReadFail: "Impossible de lire ce fichier. Essayez un autre ou collez le texte.",
    alertChooseTwo: "Choisissez deux fichiers pour voir les differences.",
  },
  EN: {
    appTitle: "ContraScope",
    appSubtitle: "MVP • Analysis • Comparison • Q&A • Signature",
    themeLight: "☀️",
    themeDark: "🌙",
    tabAnalyze: "Analyze",
    tabCompare: "Compare",
    tabQA: "Q&A",
    tabSign: "Signature",
    dragDrop: "Drop a PDF/DOCX here or click",
    formats: "Formats: PDF, DOCX — <= 10 MB",
    pasteText: "Or paste contract text",
    analyzeBtn: "Analyze",
    analyzing: "Analyzing...",
    analyzeHint: "Import a file or paste text to start the analysis.",
    riskLow: "Low",
    riskMed: "Medium",
    riskHigh: "High",
    summary: "Summary",
    probClauses: "Problematic Clauses",
    negoPoints: "Negotiation Points",
    compareTitle: "A/B Comparison",
    compareDesc: "Compare two contract versions to identify changes",
    versionA: "Version A (original)",
    versionB: "Version B (modified)",
    launchComparison: "Launch Comparison",
    compareEmpty: "Comparison result will appear here after selecting two files.",
    qaTitle: "Contract Questions",
    qaDesc: "Ask questions about the analyzed contract",
    qaPlaceholder: "Ask a question (e.g.: term, termination, liability...)",
    search: "Search",
    results: "Results",
    qaAnalyzeFirst: "Analyze a contract first.",
    qaNone: "No matching clause found.",
    qaFound: (k: string) => `Clause found: "${k}"`,
    signTitle: "Electronic Signature",
    signDesc: "Sign your contracts electronically",
    newSignature: "New Signature",
    signerName: "Signer Name",
    signerEmail: "Signer Email",
    signNow: "Sign Now",
    signHistory: "Signature History",
    noSignatures: "No signatures recorded.",
    alertReadFail: "Unable to read this file. Try another or paste the text.",
    alertChooseTwo: "Choose two files to view differences.",
  },
};

type LangKey = keyof typeof I18N;

/* Utils */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]!)
  );

const hashLite = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
};

const riskPill = (r: Risk) =>
  r === "low"
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : r === "medium"
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";

const prettyRisk = (r: Risk, L: typeof I18N[LangKey]) =>
  r === "low" ? L.riskLow : r === "medium" ? L.riskMed : L.riskHigh;

/* Rest of component logic... (continue without accents or special Unicode) */

export default function ContraScope() {
  // Component logic here
}
