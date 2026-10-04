/**
 * ESLint 扁平配置（web）
 *
 * 定位：只启用**结果确定、能抓真实缺陷**的规则。
 * 风格类规则一律不启用 —— 历史代码风格不统一，一次引入会产生大量噪音。
 *
 * 特别说明：
 * - 本项目**没有**使用 unplugin-auto-import，Vue API 必须在每个文件显式 import。
 *   因此 `vue/no-undef-components` 之类的规则会误报，已关闭。
 * - 组件采用了 `unplugin-vue-components` 的自动导入，模板里使用 `a-*` 组件时
 *   不会被解析为未定义，相关规则也一并关闭。
 *
 * 运行：npm run lint
 */
const js = require('@eslint/js');
const globals = require('globals');
const pluginVue = require('eslint-plugin-vue');

const sharedRules = {
  ...js.configs.recommended.rules,

  // ── 真正的缺陷 ────────────────────────────────
  'no-unused-vars': ['error', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    caughtErrors: 'none',
    varsIgnorePattern: '^_',
  }],
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-cond-assign': ['error', 'except-parens'],
  'no-constant-condition': ['error', { checkLoops: false }],
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-sparse-arrays': 'error',
  'no-unsafe-negation': 'error',
  'no-unsafe-optional-chaining': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'array-callback-return': 'error',
  'no-async-promise-executor': 'error',
  'no-promise-executor-return': 'error',
  'no-template-curly-in-string': 'warn',

  // ── 明确不启用（会与 AutoImport 机制冲突或纯风格） ──
  indent: 'off',
  quotes: 'off',
  semi: 'off',
  'comma-dangle': 'off',
  'vue/no-undef-components': 'off',
  'vue/multi-word-component-names': 'off',
  'vue/require-default-prop': 'off',
  'vue/attributes-order': 'off',
  'vue/html-indent': 'off',
  'vue/max-attributes-per-line': 'off',
  'vue/singleline-html-element-content-newline': 'off',
  'vue/html-self-closing': 'off',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.min.js',
    ],
  },

  // 纯 JS 文件（含 vite.config、测试）
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: sharedRules,
  },

  // Vue 单文件组件
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: sharedRules,
  },
];
