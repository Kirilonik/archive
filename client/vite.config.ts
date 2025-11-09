import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveAppConfig } from '../shared/src/config/app-config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appConfig = resolveAppConfig({
    ...process.env,
    ...env,
  });

  return {
    plugins: [react()],
    define: {
      __API_BASE_URL__: JSON.stringify(appConfig.apiBaseUrl),
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
