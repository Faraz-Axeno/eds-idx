module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': 'off', // allow both unix and windows linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'xwalk/max-cells': ['error', {
      'jsw-footer': 7,
    }],
  },
};
