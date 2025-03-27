import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    envDir: "../../.env",
    plugins: [
        react(),
        // ...,
    ],
    // These build options make the build more resilient in CI environments
    build: {
        // Generate sourcemaps for better debugging
        sourcemap: true,
        // Continue build despite warnings
        reportCompressedSize: false,
    },
});

