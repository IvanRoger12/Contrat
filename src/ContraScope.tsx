import React, { useState, useEffect } from "react";
import { Upload, Sun, Moon, Globe } from "lucide-react";

export default function ContraScope() {
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState("FR");

  // toggle theme
  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.classList.remove("light");
    else html.classList.add("light");
  }, [dark]);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        dark ? "bg-[#0b1220] text-white" : "bg-white text-slate-900"
      }`}
    >
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700 dark:border-gray-200">
        <h1 className="text-2xl font-bold text-indigo-400">ContraScope</h1>
        <nav className="flex gap-6 text-sm font-medium">
          <button className="hover:text-indigo-400">Analyser</button>
          <button className="hover:text-indigo-400">Comparer</button>
          <button className="hover:text-indigo-400">Q&A</button>
          <button className="hover:text-indigo-400">Signature</button>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-full border border-gray-500"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="flex items-center gap-1 border border-gray-500 px-2 py-1 rounded-md">
            <Globe size={16} />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="FR">FR</option>
              <option value="EN">EN</option>
              <option value="ES">ES</option>
              <option value="DE">DE</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 gap-6 p-6">
        {/* Upload + Text */}
        <section className="flex-1">
          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 transition">
            <Upload size={40} className="mb-4 text-indigo-400" />
            <p className="font-medium">
              Glissez un PDF/DOCX ici ou cliquez
            </p>
            <p className="text-sm text-gray-400">
              Formats : PDF, DOCX — ≤ 10 Mo
            </p>
          </div>
          <textarea
            className="w-full mt-4 p-3 rounded-lg border border-gray-600 dark:border-gray-300 bg-transparent"
            rows={6}
            placeholder="Ou collez le texte du contrat..."
          />
          <button className="mt-4 w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-md hover:opacity-90 transition">
            🚀 Analyser
          </button>
        </section>

        {/* Output */}
        <section className="flex-1 flex items-center justify-center border rounded-lg text-gray-400 dark:text-gray-600">
          Importez un fichier ou collez du texte pour lancer l'analyse.
        </section>
      </main>
    </div>
  );
}
