import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const REMOTE_API_TARGET = "http://8.155.145.187:8080";
const REMOTE_WS_TARGET = "ws://8.155.145.187:8080";


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
