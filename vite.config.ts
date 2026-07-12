import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Resolve Figma assets from the local src/assets directory
function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',

    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')

        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  // Vite Plugins
  plugins: [
    figmaAssetResolver(),

    // The React and Tailwind plugins are both required for Make,
    // even if Tailwind is not being actively used.
    // Do not remove them.
    react(),
    tailwindcss(),
  ],

  // Module Resolution
  resolve: {
    alias: {
      // Alias '@' to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types that can be imported as raw assets.
  // Never add .css, .ts, or .tsx files here.
  assetsInclude: [
    '**/*.svg',
    '**/*.csv',
  ],
})
