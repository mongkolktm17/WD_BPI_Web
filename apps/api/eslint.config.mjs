// Flat config for @wdbpi/api (ESLint 9+).
// Keeps `npm run lint` green in CI: type-aware rules are off on purpose
// (no project service), no-explicit-any stays a warning so legacy `any`
// usage doesn't fail the build.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'test/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
);
