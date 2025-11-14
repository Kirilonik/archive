import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveAppConfig } from '../shared/src/config/app-config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appConfig = resolveAppConfig({
    ...process.env,
    ...env,
  });

  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    define: {
      __API_BASE_URL__: JSON.stringify(appConfig.apiBaseUrl),
    },
    build: {
      sourcemap: !isProduction, // Source maps только в dev
      minify: isProduction ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: appConfig.apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
