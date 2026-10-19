import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Espelha o alias "@/*" do tsconfig.json
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // jsdom = ambiente de DOM para testar componentes React
    environment: 'jsdom',
    // describe / it / expect disponíveis sem import
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Considera testes os arquivos *.test.ts(x) e tudo dentro de __tests__
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // 'lcov' gera coverage/lcov.info consumido pelo SonarQube
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        // Layouts e o proxy de borda são casca — sem lógica a cobrir por ora
        'src/app/**/layout.tsx',
        'src/proxy.ts',
      ],
      // Piso de cobertura "ratchet" (ADR-0006): falha só se a cobertura CAIR.
      // autoUpdate reescreve os números abaixo pra cima sozinho a cada `test:cov`
      // que sobe a cobertura — commite esse arquivo junto quando isso acontecer.
      // Não é uma meta fixa: o boilerplate nasce esqueleto (ver `server/example/`),
      // um alvo tipo 80% quebraria o CI de todo projeto recém-clonado.
      thresholds: {
        statements: 94.21,
        branches: 83.87,
        functions: 93.24,
        lines: 94.19,
        autoUpdate: true,
      },
    },
  },
})
