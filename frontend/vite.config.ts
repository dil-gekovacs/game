import { defineConfig } from "vite";
import { resolve } from "node:path";

const workspaceRoot = resolve(__dirname, "..");

export default defineConfig({
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});
