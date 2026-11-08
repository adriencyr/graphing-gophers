import { defineConfig } from "vitest/config";
import { transformWithOxc } from "vite";

export default defineConfig({
  plugins: [{
    name: "next-jsx-in-js",
    enforce: "pre",
    async transform(code, id) {
      // Next.js allows JSX in .js pages; Vite needs it enabled explicitly.
      if (/\/app\/.*\.js$/.test(id)) {
        return transformWithOxc(code, id, {
          lang: "jsx",
          jsx: { runtime: "automatic" },
        });
      }
    },
  }],
  test: {
    environment: "jsdom"
  },
});
