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

  // Для dev режима: если API_BASE_URL не установлен, используем адрес сервера для proxy
  // В Docker используем http://server:4000 (внутренний адрес Docker сети)
  // Локально можно использовать http://localhost:4000
  // Проверяем, есть ли переменная окружения, указывающая на Docker окружение
  const isDocker = env.DOCKER_ENV === 'true' || process.env.DOCKER_ENV === 'true';
  const defaultProxyTarget = isDocker ? 'http://server:4000' : 'http://localhost:4000';
  const proxyTarget = appConfig.apiBaseUrl || defaultProxyTarget;

  return {
    plugins: [react()],
    define: {
      // В dev режиме используем пустую строку для относительных путей (Vite proxy)
      // В production используем полный URL
      __API_BASE_URL__: JSON.stringify(isProduction ? appConfig.apiBaseUrl : ''),
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
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true, // WebSocket support
        },
      },
    },
  };
});
