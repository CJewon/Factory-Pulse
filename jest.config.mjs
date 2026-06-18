import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./"
});

/** @type {import("jest").Config} */
const config = {
  collectCoverageFrom: ["src/lib/**/*.{ts,tsx}", "!src/lib/**/*.d.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/", "<rootDir>/tests/e2e/"]
};

export default createJestConfig(config);
