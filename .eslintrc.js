module.exports = {
  root: true,
  extends: ["prettier"],
  plugins: ["simple-import-sort"],
  parser: "@typescript-eslint/parser",
  rules: {
    "simple-import-sort/imports": [
      "error",
      {
        groups: [
          ["^@?\\w"],
          // Internal packages.
          ["^(@)(/.*|$)"],
          // Side effect imports.
          ["^\\u0000"],
          // Parent imports. Put `..` last.
          ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
          // Other relative imports. Put same-folder imports and `.` last.
          ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
        ],
      },
    ],
    "simple-import-sort/exports": "error",
  },
};
