import importAlias from '@dword-design/eslint-plugin-import-alias'
import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
	{
		ignores: ['dist/*'],
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		plugins: { js },
		extends: ['js/recommended'],
	},
	{
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
		},
	},
	{
		rules: {
			'no-undef': 'off',
		},
	},
	tseslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			'dist/**/*.ts',
			'dist/**',
			'**/*.mjs',
			'eslint.config.mjs',
			'**/*.js',
		],
	},
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: false,
				},
			],
			// '@typescript-eslint/no-unsafe-call': 'off',
		},
	},
	importAlias.configs.recommended,
	{
		rules: {
			'@dword-design/import-alias/prefer-alias': [
				'error',
				{
					alias: {
						'@': './src',
					},
					aliasForSubpaths: true,
				},
			],
		},
	},
	eslintConfigPrettier,
])
