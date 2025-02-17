import { ENV } from '../utils/env';

class WebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.debug = true;
        this.clientId = `web-${Date.now()}`;
    }

    connect() {
        try {
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            const wsUrl = ENV.WS_URL;
            this.log('Connecting to:', wsUrl);

            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.log('Connection established');
                
                // 发送GUIClientConnect消息
                const connectMessage = {
                    otype: 'GUIClientConnect',  // 必须匹配TransactionSerializer中注册的类型
                    data: {
                        id: this.clientId,
                        version: '1.0.0'
                    }
                };
                
                this.ws.send(JSON.stringify(connectMessage));
            };

            this.ws.onmessage = (event) => {
                this.log('Raw message received:', event.data);
                
                try {
                    const data = JSON.parse(event.data);
                    this.log('Parsed message:', data);
                    this.handleMessage(data);
                } catch (error) {
                    this.log('Parse error:', error);
                }
            };

            this.ws.onclose = (event) => {
                this.isConnected = false;
                this.log('Connection closed:', event.code, event.reason);
                
                if (!event.wasClean) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                this.log('Connection error:', error);
            };

        } catch (error) {
            this.log('Setup failed:', error);
        }
    }

    handleMessage(data) {
        // 处理服务器响应
        switch(data.otype) {  // 使用otype而不是type
            case 'AuthReject':
                this.log('Authentication rejected');
                this.disconnect();
                break;
            case 'TooManyClientsReject':
                this.log('Too many clients connected');
                this.disconnect();
                break;
            case 'GUISessionTimeout':
                this.log('Session timeout');
                this.disconnect();
                break;
            default:
                this.log('Received message:', data);
        }
    }

    log(...args) {
        if (this.debug) {
            console.log('[WebSocket]', ...args);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), 3000);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// 创建单例
const webSocketService = new WebSocketService();
export default webSocketService; 