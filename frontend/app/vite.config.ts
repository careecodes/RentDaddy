import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0", // Listen on all interfaces
        port: 5173,
        strictPort: true,
        cors: true,
    },
    preview: {
        host: "0.0.0.0",
        port: 5173,
    },
    build: {
        sourcemap: true,
        outDir: "dist",
        assetsDir: "assets",
        // Keep CSS in separate files
        cssCodeSplit: true,
    }
});