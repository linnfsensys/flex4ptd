import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

import { config } from 'dotenv';

// Load environment variables from .env file
config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base:"/",
  define: {
    'process.env': process.env
  },
  server: {
    port: 3000, // Set the desired port here
    historyApiFallback: true,
  },
})
