import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  server: {
    port: 5173,
    host: true,
=======
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
>>>>>>> fa2e5caf59a50ad9d65129a3950361ec1ca7db4c
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
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
=======
<<<<<<< HEAD
});
=======
});
>>>>>>> 868b9d4 (Initial commit: Adding AI Fake News Detector)
>>>>>>> 498a16188c363080c487c0305a41394123bdf5c6
>>>>>>> fa2e5caf59a50ad9d65129a3950361ec1ca7db4c
