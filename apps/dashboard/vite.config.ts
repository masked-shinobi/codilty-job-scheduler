import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    envDir: '../../',
    resolve: {
      alias: mode === 'development' ? {
        '@clerk/clerk-react': '/src/lib/clerkMock.tsx',
      } : undefined,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
})
