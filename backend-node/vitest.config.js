/** @type {import('vitest/config').UserConfig} */
module.exports = {
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: [
        'src/api/**/*.js',
        'src/realtime/**/*.js',
        'src/runtime/**/*.js',
      ],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
};
