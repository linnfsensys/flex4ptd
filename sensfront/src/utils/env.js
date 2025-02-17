export const getEnvVar = (key, defaultValue = '') => {
    const value = import.meta.env[key];
    console.log(`Getting env var ${key}:`, value); // 调试日志
    return value || defaultValue;
};

export const ENV = {
    WS_URL: getEnvVar('VITE_WS_URL', 'ws://192.168.3.226/test.ws'),
    MAP_APIKEY: getEnvVar('VITE_MAP_APIKEY'),
    // ... 其他环境变量
};

// 调试日志
console.log('Loaded ENV:', ENV); 