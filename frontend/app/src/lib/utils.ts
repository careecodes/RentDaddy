export function absoluteServerUrl(path: string): string {
    if (typeof window !== "undefined") return path;

    const serverUrl = import.meta.env.VITE_SERVER_URL ?? import.meta.env.VITE_DOMAIN_URL;
    const port = import.meta.env.VITE_PORT ?? 8080;

    if (import.meta.env.DEV) {
        return `http://localhost:${port}${path}`;
    }

    return serverUrl ? `${serverUrl}${path}` : `http://localhost:${port}${path}`;
}

export function absoluteUrl(path: string): string {
    if (typeof window !== "undefined") return path;

    const frontendUrl = import.meta.env.VITE_DOMAIN_URL;
    const frontendPort = import.meta.env.VITE_FRONTEND_PORT ?? 5173;

    if (import.meta.env.DEV) {
        return `http://localhost:${frontendPort}${path}`;
    }

    return frontendUrl ? `${frontendUrl}${path}` : `http://localhost:${frontendPort}${path}`;
}
