import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/smoke-dist/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // 테스트·설정 스크립트와 Cloud Function은 Node 환경에서 실행된다.
  // scripts/도 여기에 든다 — 브라우저가 아니라 CI와 개발자 터미널에서 돈다.
  {
    name: 'app/node-scripts',
    files: [
      'tests/**/*.mjs',
      'scripts/**/*.{js,mjs}',
      'functions/**/*.{js,mjs}',
      '*.config.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
])
