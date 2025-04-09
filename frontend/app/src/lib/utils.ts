export function generateAccessCode(length = 8) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let accessCode = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        accessCode += characters[randomIndex];
    }

    return accessCode;
}

/**
 * Logger utility for the entire application
 * Uses environment variables to determine whether to log
 * 
 * In production mode:
 * - log, info, and debug methods are silent
 * - warn and error continue to work as normal
 *
 * Usage:
 * import { logger } from '../lib/utils';
 * 
 * logger.log('User data:', userData);
 * logger.info('Component mounted');
 * logger.warn('Deprecated feature used');
 * logger.error('API request failed', error);
 * logger.debug('Detailed state:', state);
 */
export const logger = {
    log: (...args: any[]) => {
        if (import.meta.env.VITE_ENV !== 'production') {
            console.log(...args);
        }
    },
    info: (...args: any[]) => {
        if (import.meta.env.VITE_ENV !== 'production') {
            console.info(...args);
        }
    },
    warn: (...args: any[]) => {
        // We still show warnings in production
        console.warn(...args);
    },
    error: (...args: any[]) => {
        // Always show errors
        console.error(...args);
    },
    debug: (...args: any[]) => {
        if (import.meta.env.VITE_ENV !== 'production') {
            console.debug(...args);
        }
    },
    // Group related logs together
    group: (label: string, collapsed = false) => {
        if (import.meta.env.VITE_ENV !== 'production') {
            collapsed ? console.groupCollapsed(label) : console.group(label);
        }
    },
    groupEnd: () => {
        if (import.meta.env.VITE_ENV !== 'production') {
            console.groupEnd();
        }
    },
    // For measuring performance
    time: (label: string) => {
        if (import.meta.env.VITE_ENV !== 'production') {
            console.time(label);
        }
    },
    timeEnd: (label: string) => {
        if (import.meta.env.VITE_ENV !== 'production') {
            console.timeEnd(label);
        }
    }
}
