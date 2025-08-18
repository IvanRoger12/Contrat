import React, { useState } from "react";
import { Upload, FileText, Copy } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

export default function ContraScope() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.type === "application/pdf") {
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((s: any) => s.str).join(" ");
      }
      setSummary(analyzeText(text));
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      setSummary(analyzeText(result.value));
    } else {
      alert("Format non supporté. Importez un PDF ou DOCX.");
    }
  };

  const analyzeText = (text: string) => {
    // Simulation d’analyse simple
    return `Résumé clair du contrat :
- Durée : 12 mois
- Résiliation : préavis de 3 mois
- Clause RGPD : conforme
- Indemnisation : limitée à 10k€`;
  };

  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      alert("Résumé copié !");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center p-8 transition-colors">
      {/* Titre */}
      <h1 className="text-4xl font-extrabold mb-6 text-glow">ContraScope</h1>

      {/* Zone de dépôt */}
      <label className="border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
        <Upload className="w-10 h-10 mb-3 text-glow" />
        <span className="text-sm">Déposez un contrat PDF/DOCX ici</span>
        <input type="file" className="hidden" onChange={handleFileUpload} />
      </label>

      {/* Nom du fichier */}
      {fileName && (
        <div className="mt-4 flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>{fileName}</span>
        </div>
      )}

      {/* Résultats */}
      {summary && (
        <div className="mt-8 w-full max-w-2xl bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-glow">Résumé</h2>
          <pre className="whitespace-pre-wrap">{summary}</pre>

          {/* Bouton copier */}
          <button
            onClick={copyToClipboard}
            className="mt-4 flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier
          </button>

          {/* Suggestions */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-3 text-glow">Suggestions de négociation</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Proposer un préavis de 1 mois au lieu de 3</li>
              <li>Demander une limite d’indemnisation de 50k€</li>
              <li>Clarifier la durée de renouvellement automatique</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
