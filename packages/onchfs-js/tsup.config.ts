import { defineConfig } from "tsup"

const defaultConfig = {
  entry: ["src/index.ts"],
  outDir: "dist",
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  bundle: true,
}

export default defineConfig([
  {
    ...defaultConfig,
    format: ["cjs", "esm"],
  },
  // Generate a minified version for browsers
  {
    ...defaultConfig,
    format: ["iife"],
    minify: true,
  },
])
