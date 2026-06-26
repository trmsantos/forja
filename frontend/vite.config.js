import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Frontend runs on :4000, proxies API calls to the FastAPI backend on :8010.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 4000,
        proxy: {
            "/api": {
                target: "http://localhost:8010",
                changeOrigin: true,
            },
        },
    },
});
