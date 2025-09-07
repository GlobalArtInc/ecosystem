import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  treeshake: true,
  target: "es2024",
  external: ["oxide.ts"],
});
