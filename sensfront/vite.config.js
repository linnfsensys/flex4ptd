import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Loaded environment variables:', env); // 调试日志

  return {
    plugins: [react()],
    base: "/",
    define: {
      // 确保环境变量可用
      'process.env': env,
      'import.meta.env': JSON.stringify(env)
    },
    server: {
      port: 3000
    }
  };
});
