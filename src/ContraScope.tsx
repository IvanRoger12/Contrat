import React, { useState } from "react";
import { Upload, FileText, Copy, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Helpers d’apparence (light vs dark)
const cardClass = (dark: boolean) =>
  dark
    ? "bg-white/5 border border-white/10"
    : "bg-white/90 border border-slate-200 shadow-sm backdrop-blur-sm";

const headingClass = (dark: boolean) =>
  dark ? "text-white" : "text-slate-900 text-glow";

const mutedTextClass = (dark: boolean) =>
  dark ? "text-slate-300" : "text-slate-700 text-glow";

const ContraScope: React.FC = () => {
  const [dark, setDark] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setLoading(true);

    let text = "";

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const content = await page.getTextContent();
        text += content.items.map((s: any) => s.str).join(" ") + "\n";
      }
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      text = "Format non supporté.";
    }

    // --- Fake résumé pour MVP ---
    setSummary(
      "Résumé clair du contrat :\n- Durée : 12 mois\n- Résiliation : préavis de 3 mois\n- Clause RGPD : conforme\n- Indemnisation : limitée à 10k€\n\nSuggestions de négociation :\n• Proposer un préavis de 1 mois au lieu de 3\n• Demander une limite d’indemnisation de 50k€\n• Clarifier la durée de renouvellement automatique"
    );
    setLoading(false);
  };

  return (
    <div
      className={`${
        dark
          ? "bg-slate-950 text-slate-100"
          : "bg-gradient-to-br from-white via-slate-50 to-white text-slate-900"
      } min-h-screen antialiased`}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1
            className={`${headingClass(
              dark
            )} text-2xl font-bold flex items-center gap-2`}
          >
            <FileText className="w-6 h-6" />
            ContraScope
          </h1>
          <button
            onClick={() => setDark(!dark)}
            className="px-3 py-1 text-sm rounded-lg border border-slate-400/30"
          >
            {dark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>

        {/* Importer un contrat */}
        <div className={`${cardClass(dark)} rounded-2xl p-6 mb-6`}>
          <h2
            className={`${headingClass(
              dark
            )} font-bold text-lg flex items-center gap-2 mb-4`}
          >
            <Upload className="w-5 h-5" />
            Importer un contrat
          </h2>

          <label
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-400/40 rounded-xl p-10 cursor-pointer hover:border-indigo-500 transition"
          >
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
              accept=".pdf,.docx"
            />
            <span className="text-indigo-500 font-medium">
              Glissez un PDF/DOCX ici ou cliquez
            </span>
            <span className={`${mutedTextClass(dark)} text-sm`}>
              Formats : PDF, DOCX — 10 Mo max
            </span>
          </label>

          {fileName && (
            <p className={`${mutedTextClass(dark)} mt-4 flex items-center gap-2`}>
              📄 {fileName}
            </p>
          )}
        </div>

        {/* Résultats */}
        <div className={`${cardClass(dark)} rounded-2xl p-6 min-h-[24rem]`}>
          <h2
            className={`${headingClass(
              dark
            )} font-bold text-lg flex items-center gap-2 mb-4`}
          >
            Résultats
          </h2>

          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin w-5 h-5 text-indigo-500" />
              <span className={`${mutedTextClass(dark)}`}>
                Analyse en cours…
              </span>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {summary}
              </pre>
              <button
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600"
                onClick={() => navigator.clipboard.writeText(summary)}
              >
                <Copy className="w-4 h-4" />
                Copier
              </button>
            </div>
          ) : (
            <p className={`${mutedTextClass(dark)}`}>
              Importez un fichier pour lancer l’analyse.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContraScope;
