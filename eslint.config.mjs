// eslint.config.js (ESLint 9+ 扁平化配置)
import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            // 代码质量
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'no-undef': 'error',
            'no-console': 'off', // 后端项目允许 console

            // 最佳实践
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',
            'prefer-arrow-callback': 'warn',

            // 代码风格
            'indent': ['warn', 4], // 4 空格缩进
            'quotes': ['warn', 'single', { avoidEscape: true }],
            'semi': ['warn', 'always'],
            'comma-dangle': ['warn', 'never'],
            'no-trailing-spaces': 'warn',
            'eol-last': ['warn', 'always'],

            // 可读性
            'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
            'space-before-function-paren': ['warn', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always'
            }],
            'object-curly-spacing': ['warn', 'always'],
            'array-bracket-spacing': ['warn', 'never'],

            // 错误预防
            'no-await-in-loop': 'warn',
            'require-atomic-updates': 'warn',
            'no-return-await': 'warn'
        },
        ignores: [
            'node_modules/',
            'dist/',
            'build/',
            '*.db',
            '*.log'
        ]
    }
];
