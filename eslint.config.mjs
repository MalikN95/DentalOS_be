// @ts-check
import eslint from '@eslint/js';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'commitlint.config.mjs', 'dist/**', 'coverage/**'],
  },
  // Airbnb base (JS)
  eslint.configs.recommended,
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,
  // Airbnb node
  plugins.node,
  ...configs.node.recommended,
  // Airbnb TypeScript
  plugins.typescriptEslint,
  ...configs.base.typescript,
  ...tseslint.configs.recommendedTypeChecked,
  // Prettier must come last to disable conflicting stylistic rules
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // NestJS relies on classes, DI via constructor parameters and decorators
      'import-x/prefer-default-export': 'off',
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'class-methods-use-this': 'off',
      'max-classes-per-file': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      // TypeORM entities use class properties without initializers
      '@typescript-eslint/no-non-null-assertion': 'off',
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**', 'src/database/**'] },
      ],
      // `void promise` marks intentionally not awaited promises (pairs with no-floating-promises)
      'no-void': ['error', { allowAsStatement: true }],
    },
  },
  {
    // TypeORM relations are bidirectional: entity imports are cyclic by design,
    // runtime is safe because decorator callbacks resolve lazily
    files: ['src/entities/**/*.ts'],
    rules: {
      'import-x/no-cycle': 'off',
    },
  },
);
