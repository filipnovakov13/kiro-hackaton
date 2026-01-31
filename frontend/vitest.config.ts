import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.property.test.ts",
    ],
    exclude: ["tests/ux-validation.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    testTimeout: 30000, // 30 seconds for property tests
    server: {
      deps: {
        inline: ["react-syntax-highlighter", "refractor"],
      },
    },
  },
});
