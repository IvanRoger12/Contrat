import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173, 
    host: true,
    strictPort: true // Évite le port aléatoire si 5173 est occupé
  },
  build: {
    sourcemap: false,
    outDir: "dist",
    assetsInlineLimit: 4096, // Taille max (en bytes) pour l'inlining des assets
    rollupOptions: {
      output: {
        manualChunks: {
          // Optimisation du chunking pour React
          react: ['react', 'react-dom'],
          vendors: ['lucide-react'], 
        }
      }
    },
    minify: 'terser' // Meilleure minification que esbuild par défaut
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Pré-bundle des dépendances
    exclude: ['js-big-decimal'] // Exclure si nécessaire
  },
  esbuild: {
    jsxInject: `import React from 'react'` // Plus besoin d'importer React manuellement
  }
});
