import React, { useState } from "react"
import { Upload, FileText, Copy, Check, Edit3, Moon, Sun } from "lucide-react"

export default function ContraScope() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [dark, setDark] = useState(true)

  // simulation analyse
  const handleAnalyze = () => {
    if (!uploadedFile) return
    setAnalysis(`
Résumé clair du contrat :
- Durée : 12 mois
- Résiliation : préavis de 3 mois
- Clause RGPD : conforme
- Indemnisation : limitée à 10k€
`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`${dark ? "bg-slate-900 text-white" : "bg-white text-slate-900"} min-h-screen`}>
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-white/10">
        <h1 className="text-2xl font-bold">ContraScope</h1>
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full hover:bg-slate-700/30"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Upload */}
        <div className="border-2 border-dashed rounded-xl p-6 text-center">
          <Upload className="w-10 h-10 mx-auto opacity-60" />
          <p className="mt-2">Déposez un contrat PDF/DOCX ici</p>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
            className="mt-4 block mx-auto"
          />
          {uploadedFile && (
            <p className="mt-2 text-sm opacity-70">📄 {uploadedFile.name}</p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!uploadedFile}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-500"
          >
            Analyser
          </button>
        </div>

        {/* Résultat */}
        {analysis && (
          <div className="rounded-xl bg-slate-800/70 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" /> Résumé
              </h2>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copier
                  </>
                )}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-slate-200">{analysis}</pre>
          </div>
        )}

        {/* Suggestions */}
        {analysis && (
          <div className="rounded-xl bg-slate-800/70 p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Edit3 className="w-5 h-5" /> Suggestions de négociation
            </h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Proposer un préavis de 1 mois au lieu de 3</li>
              <li>Demander une limite d’indemnisation de 50k€</li>
              <li>Clarifier la durée de renouvellement automatique</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
