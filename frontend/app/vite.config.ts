import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    envDir: "../../.env",
    plugins: [react()],
    server: {
        host: "0.0.0.0",               // 🔥 Listen on all interfaces (not just localhost)
        port: 5173,                    // 🔒 Must match ECS container & ALB config
        strictPort: true,             // 📌 Avoid port fallbacks
        cors: true,                   // ✅ Needed for browser ALB requests
        origin: "https://app.curiousdev.net", // 🧠 Helps Vite generate correct URLs (optional but safe)
    },
    preview: {
        host: "0.0.0.0",
        port: 5173,
    },
    build: {
        sourcemap: true,
        reportCompressedSize: false,
    },
});

