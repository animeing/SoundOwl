module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['plugin:vue/vue3-recommended', 'eslint:recommended'],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  rules: {
    'vue/html-indent': ['error', 4],
    'vue/script-indent': [
      'error',
      2,
      {
        baseIndent: 0,
        switchCase: 1,
        ignores: [],
      },
    ],
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'vue/html-closing-bracket-newline': [2, {'multiline': 'never'}],
    'no-unused-vars':[
      'warn',
      {
        'argsIgnorePattern': '^_'
      }
    ]
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        indent: 'off',
      }
    },
    {
      files: [
        '.eslintrc.js',
        'webpack.config.js'
      ],
      env: {
        node: true
      }
    }
  ],
};
  