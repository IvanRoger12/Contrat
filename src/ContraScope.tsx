import React, { useEffect, useState } from "react";
import { Sun, Moon, Globe, Upload } from "lucide-react";

type Tab = "analyze" | "compare" | "qa" | "sign";

export default function ContraScope() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("analyze");
  const [lang, setLang] = useState("FR");

  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.classList.remove("light");
    else html.classList.add("light");
  }, [dark]);

  return (
    <div className={`min-h-screen flex flex-col ${dark ? "bg-[#0b1220] text-white" : "bg-white text-slate-900"}`}>
      {/* HEADER */}
      <header className="px-6 md:px-10 pt-6 pb-4 relative z-20">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 grid place-items-center shadow-lg">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-[34px] font-extrabold tracking-tight">
                Contra<span className="text-indigo-300">Scope</span>
              </h1>
              <p className="mt-1 text-sm md:text-[15px] text-slate-300">
                <strong className="font-semibold">MVP</strong> • Analyse • Comparaison • Q&amp;A • Signature
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10 transition"
              title="Basculer le thème"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-sm">{dark ? "Clair" : "Sombre"}</span>
            </button>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
              <Globe size={16} />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent outline-none text-sm"
              >
                <option>FR</option><option>EN</option><option>ES</option><option>DE</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-6">
          <nav className="grid grid-cols-4 gap-3 bg-white/5 border border-white/10 p-1 rounded-2xl relative z-20">
            <TabButton type="button" active={tab==="analyze"} onClick={() => setTab("analyze")} emoji="🔍" label="Analyser" gradient="from-cyan-500 to-blue-500" />
            <TabButton type="button" active={tab==="compare"} onClick={() => setTab("compare")} emoji="🧾" label="Comparer" gradient="from-violet-500 to-purple-500" />
            <TabButton type="button" active={tab==="qa"} onClick={() => setTab("qa")} emoji="❓" label="Q&A" gradient="from-emerald-500 to-teal-500" />
            <TabButton type="button" active={tab==="sign"} onClick={() => setTab("sign")} emoji="✒️" label="Signature" gradient="from-orange-500 to-rose-500" />
          </nav>
        </div>
      </header>

      {/* MAIN (rendu conditionnel) */}
      <main className="px-6 md:px-10 pb-10 relative z-10">
        {tab === "analyze" && <AnalyzeSection />}
        {tab === "compare" && <CompareSection />}
        {tab === "qa" && <QASection />}
        {tab === "sign" && <SignSection />}
      </main>
    </div>
  );
}

/* ---- Subcomponents ---- */
function TabButton({
  active, onClick, emoji, label, gradient, type="button"
}: {
  active: boolean; onClick: () => void; emoji: string; label: string; gradient: string; type?: "button"|"submit"|"reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm md:text-[15px] font-semibold transition ${
        active ? `bg-gradient-to-r ${gradient} text-white shadow-lg` : "text-slate-300 hover:bg-white/10"
      }`}
    >
      <span className="text-lg">{emoji}</span><span>{label}</span>
    </button>
  );
}

function AnalyzeSection() {
  return (
    <section className="grid lg:grid-cols-2 gap-8">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="border-2 border-dashed border-fuchsia-400/50 rounded-2xl p-10 text-center hover:border-fuchsia-400 transition cursor-pointer"
             onClick={() => document.getElementById("file-input")?.click()}>
          <div className="w-fit mx-auto mb-5 p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 shadow">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-semibold">Glissez un PDF/DOCX ici ou cliquez</p>
          <p className="text-slate-300 text-sm mt-2">Formats : PDF, DOCX — ≤ 10 Mo</p>
          <input id="file-input" type="file" hidden accept=".pdf,.docx" />
        </div>

        <div className="mt-6">
          <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <span>💬</span> Ou collez le texte du contrat
          </label>
          <textarea className="w-full h-44 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ou collez le texte du contrat..." />
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold shadow hover:opacity-95">
            🚀 Analyser
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 grid place-items-center min-h-[22rem]">
        <p className="text-slate-300 text-center text-[15px]">Importez un fichier ou collez du texte pour lancer l'analyse.</p>
      </div>
    </section>
  );
}

function CompareSection() {
  return (
    <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><span>🧾</span> Comparaison A/B</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div><p className="text-sm text-slate-300 mb-2">Version A (original)</p><input type="file" accept=".pdf,.docx" className="block w-full text-sm" /></div>
        <div><p className="text-sm text-slate-300 mb-2">Version B (modifiée)</p><input type="file" accept=".pdf,.docx" className="block w-full text-sm" /></div>
      </div>
      <div className="mt-6"><button type="button" className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold shadow hover:opacity-95">🚀 Lancer la comparaison</button></div>
      <div className="mt-6 min-h-[10rem] bg-black/20 border border-white/10 rounded-xl p-4"><p className="text-slate-300 text-sm">Le résultat apparaîtra ici.</p></div>
    </section>
  );
}

function QASection() {
  return (
    <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><span>❓</span> Q&amp;A (poser vos questions)</h2>
      <div className="flex flex-col md:flex-row gap-3">
        <input className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
               placeholder="Ex : résiliation, durée, responsabilité…" />
        <button type="button" className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow hover:opacity-95">
          🔎 Chercher
        </button>
      </div>
      <div className="mt-6 min-h-[8rem] bg-black/20 border border-white/10 rounded-xl p-4"><p className="text-slate-300 text-sm">Les résultats s'afficheront ici.</p></div>
    </section>
  );
}

function SignSection() {
  return (
    <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><span>✒️</span> Signature électronique</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <input className="bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-sm" placeholder="Nom du signataire" />
        <input className="bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-sm" placeholder="Email du signataire" />
        <button type="button" className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold shadow hover:opacity-95">
          ✍️ Signer maintenant
        </button>
      </div>
      <div className="mt-6 bg-black/20 border border-white/10 rounded-xl p-4"><p className="text-slate-300 text-sm">Historique des signatures — aucun élément pour l'instant.</p></div>
    </section>
  );
}
