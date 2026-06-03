import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main'),
      },
    },
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          library: resolve('src/renderer/library/index.html'),
          overlay: resolve('src/renderer/overlay/index.html'),
          shelf: resolve('src/renderer/shelf/index.html'),
          settings: resolve('src/renderer/settings/index.html'),
          onboarding: resolve('src/renderer/onboarding/index.html'),
        },
      },
    },
  },
})
