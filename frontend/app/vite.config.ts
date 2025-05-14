import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { ConfigEnv } from 'vite';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
    // Load env file based on `mode` in the current directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, path.resolve(__dirname), '');

    // Safe console.log for build environment
    if (mode === 'development') {
        console.log('Vite environment variables:');
        console.log('VITE_BACKEND_URL:', env.VITE_BACKEND_URL);
        console.log('VITE_ENV:', env.VITE_ENV);
    }

    return {
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
        },
        // Make sure all env variables are available in the browser
        define: {
            'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL || ''),
            'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.VITE_CLERK_PUBLISHABLE_KEY || ''),
            'import.meta.env.VITE_DOCUMENSO_PUBLIC_URL': JSON.stringify(env.VITE_DOCUMENSO_PUBLIC_URL || ''),
            'import.meta.env.VITE_ENV': JSON.stringify(env.VITE_ENV || 'development'),
        }
    };
});