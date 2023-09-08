import { defineConfig } from "tsup"
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill"

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
  // Generate a browser build with required polyfills
  {
    ...defaultConfig,
    format: ["iife"],
    platform: "browser",
    esbuildPlugins: [NodeModulesPolyfillPlugin() as any],
  },
])
