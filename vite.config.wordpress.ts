// @ts-nocheck
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: "./",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/wordpress-editor"),
      "vue-router": resolve(__dirname, "src/wordpress-editor/router/wordpress/mockRouter.ts"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist-wordpress",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/wordpress-editor/pod-customizer/index.ts"),
      name: "Mockup100PodCustomizer",
      formats: ["umd", "iife"],
      fileName: (format) => `mockup100-pod-customizer.${format}.js`,
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue",
        },
        assetFileNames: "mockup100-pod-customizer.[ext]",
        chunkFileNames: "mockup100-pod-customizer.[hash].js",
      },
    },
    minify: "esbuild",
  },
})
