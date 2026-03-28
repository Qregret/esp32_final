import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const REMOTE_API_TARGET = "https://esp32finalback-production.up.railway.app";
const REMOTE_WS_TARGET = "wss://esp32finalback-production.up.railway.app";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: REMOTE_API_TARGET,
        changeOrigin: true,
      },
      "/ws": {
        target: REMOTE_WS_TARGET,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
