import React, { useState } from "react"
import { Upload, FileText, Sun, Moon } from "lucide-react"

export default function ContraScope() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState("")

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0]
    if (uploaded) {
      setFile(uploaded)
      setSummary(`
Résumé clair du contrat :
- Durée : 12 mois
- Résiliation : préavis de 3 mois
- Clause RGPD : conforme
- Indemnisation : limitée à 10k€

Suggestions de négociation :
- Proposer un préavis de 1 mois au lieu de 3
- Demander une limite d’indemnisation de 50k€
- Clarifier la durée de renouvellement automatique
`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Header */}
      <header className="flex justify-between items-center p-4 shadow-md bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-glow">⚖️ ContraScope</h1>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {/* Upload zone */}
      <main className="flex flex-col items-center p-6 space-y-6">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <Upload className="w-10 h-10 mb-2 text-gray-500" />
          <span className="font-medium text-glow">Déposez un contrat PDF/DOCX ici</span>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        {file && (
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-blue-500" />
              <p className="font-semibold">{file.name}</p>
            </div>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap text-sm text-glow">
              {summary}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
