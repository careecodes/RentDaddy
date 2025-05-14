# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Using the Logger to Disable Console Messages in Production

To disable console.log messages in production while maintaining them in development, use the `logger` utility:

```tsx
import { logger } from './src/lib/utils';

// These won't show in production
logger.log('Component rendered');
logger.info('User authenticated:', userId);
logger.debug('Current state:', state);

// These will show in all environments
logger.warn('Feature is deprecated');
logger.error('Failed to load data:', error);

// Group related logs (not shown in production)
logger.group('User Authentication');
logger.log('Auth step 1');
logger.log('Auth step 2');
logger.groupEnd();

// Measure performance (not shown in production)
logger.time('Operation timing');
// ... perform operation
logger.timeEnd('Operation timing');
```

### Configuration

The logger uses the `VITE_ENV` environment variable to determine whether to log messages. In production (`VITE_ENV=production`), only warnings and errors are shown.

1. For development:
   ```
   VITE_ENV=development
   ```

2. For production:
   ```
   VITE_ENV=production
   ```

The logger will automatically detect the environment and adjust its behavior accordingly.
