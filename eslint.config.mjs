import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sonarjs from 'eslint-plugin-sonarjs'

import { regrasDoKit } from './eslint.kit.mjs'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Desliga regras de estilo do ESLint que conflitam com o Prettier (ADR-0002) —
  // formatação é responsabilidade só do Prettier, ESLint cuida de correção/qualidade.
  prettierConfig,
  // Convenções do kit fh-estado que viraram regra de lint (eslint.kit.mjs): const,
  // any, console, import por alias e tipo de retorno explícito em service/controller.
  ...regrasDoKit,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // Respeita a convenção TypeScript de prefixar com _ variáveis intencionalmente não usadas.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Ordena e agrupa imports automaticamente (externos → alias @/ → relativos) e
      // corrige sozinha com --fix. Reforça a convenção de alias do CLAUDE.md deixando
      // o diff de imports sempre no mesmo formato (ADR-0003).
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      boundaries,
    },
    settings: {
      // Classifica cada arquivo em "elemento" (pasta) + "categoria" (papel do
      // arquivo dentro da pasta), pra reforçar por lint o fluxo app/api →
      // controller → service do AGENTS.md (ADR-0007). "domain" cobre qualquer
      // pasta em src/server/* (inclui db/http/auth — eles não têm arquivo
      // *.service.ts, então nunca batem na policy abaixo). Tudo que não casar
      // em nenhum padrão (proxy.ts, css, instrumentation) segue livre.
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'domain', pattern: 'src/server/*', capture: ['domain'] },
        { type: 'shared', pattern: 'src/shared' },
      ],
      'boundaries/files': [
        { category: 'controller', pattern: '**/*.controller.ts' },
        { category: 'service', pattern: '**/*.service.ts' },
        { category: 'schema', pattern: '**/*.schema.ts' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'app' } },
              disallow: { to: { element: { type: 'domain' }, file: { categories: ['service'] } } },
              message:
                'app/ não pode importar *.service.ts direto — passe pelo controller (app/api → controller → service).',
            },
            {
              from: { element: { type: 'domain' }, file: { categories: ['service'] } },
              disallow: { to: { element: { type: 'app' } } },
              message:
                'service não pode importar nada de app/ — regra de negócio não conhece UI/rota.',
            },
          ],
        },
      ],
    },
  },
  {
    // Limites de tamanho/duplicação (ADR-0008) — pensados para código gerado por IA:
    // função e arquivo pequenos o bastante para revisar de verdade, duplicação baixa
    // o bastante para não virar débito silencioso. Escopo só em src/ (código de produto).
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      sonarjs,
    },
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      // Mesmas regras que o SonarQube aplica no scan completo (ADR-0008), mas
      // rodando local no `yarn lint` — feedback antes de subir o container do Sonar.
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicate-string': 'warn',
    },
  },
  {
    // Teste legitimamente enumera muitos casos (happy path, borda, erro — ver
    // /criar-testes) e cresce em número de describe/it, não em complexidade por
    // função. Relaxa o limite de arquivo, mantém o de função (cada it() continua
    // pequeno) e desliga no-duplicate-string (fixtures repetem valores de propósito).
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'sonarjs/no-duplicate-string': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Relatório de cobertura gerado pelo Vitest
    'coverage/**',
    // Kit de processo e referências de template — não são código do produto
    '.claude/**',
    'scripts/**',
    'Next-Project-Boilerplate/**',
    'fh-kit-estado/**',
  ]),
])

export default eslintConfig
