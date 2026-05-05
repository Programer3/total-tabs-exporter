// web-ext configuration
export default {
  build: {
    overwriteDest: true,
  },
  ignoreFiles: [
    "node_modules",
    "dist",
    "tests",
    "*.test.js",
    ".eslintrc.json",
    ".web-ext-config.js",
    "package.json",
    "package-lock.json",
    "README.md",
    "dev.md",
    "jest.config.js",
    ".gitignore",
    ".gitattributes"
  ],
};
