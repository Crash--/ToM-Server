import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tests import types with `import { type X }`, sometimes from paths that do
  // not exist; drop those imports instead of keeping them as side effects.
  oxc: {
    typescript: {
      onlyRemoveTypeImports: false,
    },
  },
  test: {
    globals: true,
    // Test files share __testData__ databases.
    fileParallelism: false,
  },
});
