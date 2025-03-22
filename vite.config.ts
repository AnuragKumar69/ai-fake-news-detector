import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
<<<<<<< HEAD
=======
<<<<<<< HEAD
});
=======
>>>>>>> 498a16188c363080c487c0305a41394123bdf5c6
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
  },
  assetsInclude: ['**/*.wasm'],
<<<<<<< HEAD
});
=======
});
>>>>>>> 868b9d4 (Initial commit: Adding AI Fake News Detector)
>>>>>>> 498a16188c363080c487c0305a41394123bdf5c6
