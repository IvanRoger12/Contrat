import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Configuration optimisée pour Vercel et résolution des erreurs URI
export default defineConfig({
  plugins: [react()],
  
  // Configuration du serveur de développement
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    fs: {
      strict: false // Permet de résoudre certains problèmes de chemin
    }
  },

  // Configuration de build
  build: {
    outDir: "dist",
    sourcemap: false, // Désactive les sourcemaps en production
    assetsInlineLimit: 0, // Empêche l'inlining des assets problématiques
    emptyOutDir: true, // Nettoie le dossier de sortie avant chaque build
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name].[hash][extname]", // Format des noms de fichiers
        chunkFileNames: "chunks/[name].[hash].js",
        entryFileNames: "entries/[name].[hash].js"
      }
    },
    minify: "terser" // Minification plus efficace
  },

  // Optimisation des dépendances
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
    exclude: ["pdfjs-dist"] // Exclut les libs lourdes
  },

  // Configuration des résolutions
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },

  // Précautions supplémentaires
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" }
  }
});
