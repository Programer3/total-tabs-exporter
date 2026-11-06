// web-ext configuration
export default {
  build: {
    overwriteDest: true,
  },
  ignoreFiles: [
    "node_modules",
    "dist",
    "tests",
    "coverage",
    ".rules",
    ".github",
    ".git",
    "*.test.js",
    ".eslintrc.json",
    ".web-ext-config.mjs",
    ".web-ext-config.js",
    "package.json",
    "package-lock.json",
    "jest.config.js",
    ".gitignore",
    ".gitattributes",
    ".cursorrules",
    "*.md",
    "screenshot-*.png",
    "LICENSE",
  ],
};
