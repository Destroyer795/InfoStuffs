import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // optional alias
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
  // 👇 ADD THIS:
  base: '/',
});
// This configuration sets up Vite for a React project, specifying plugins, aliases, output directory, server port, and base path for deployment.
// It ensures that the application can be built and served correctly, especially when deployed to production environments.
// The `base` option is set to `'/'` to ensure that the application works correctly when deployed to a subdirectory or root path.
// The `outDir` is set to `'dist'`, which is the default output directory for Vite builds.
// The `server` configuration specifies the port on which the development server will run, set to `3000` in this case.
// The `resolve.alias` option allows you to create an alias for the `src` directory, making imports cleaner and easier to manage.
// The `react` plugin is included to enable React support in the Vite build process.
// The `defineConfig` function is used to define the Vite configuration, providing type safety and autocompletion in IDEs.
// This configuration is essential for setting up a modern React application with Vite, ensuring fast development and efficient production builds.
// The `plugins` array includes the React plugin, which is necessary for processing React files and enabling features like JSX syntax.
// The `resolve` section allows you to define custom path aliases, which can simplify import statements throughout your application.
// The `build` section specifies the output directory for the production build, which is set to `dist`.
// This configuration file is essential for setting up a Vite project with React, ensuring that the application can be built and served correctly in both development and production environments.
