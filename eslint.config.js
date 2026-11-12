const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react/*', 'react-native', 'react-native/*', 'react-native-*', 'expo', 'expo-*', 'zustand', '@/*', '@services/*'], message: 'game/ is platform-free plain TypeScript.' },
          ],
        },
      ],
    },
  },
  { ignores: ['dist/*', '.expo/*'] },
]);
