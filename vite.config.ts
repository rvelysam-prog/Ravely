import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        html2canvas: 'html2canvas-pro'
      }
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          employe: path.resolve(__dirname, 'employe.html')
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('tesseract.js')) return 'vendor-ocr';
            if (id.includes('pdfjs-dist') || id.includes('jspdf') || id.includes('html2canvas-pro')) {
              return 'vendor-pdf';
            }
            if (id.includes('/docx/') || id.includes('jszip') || id.includes('mammoth')) {
              return 'vendor-office';
            }
            if (id.includes('lucide-react') || id.includes('motion')) {
              return 'vendor-ui';
            }
            return undefined;
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {}
    }
  };
});
