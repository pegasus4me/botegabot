type WebSocketCallback = (data: any) => void;

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private apiKey: string | null = null;
    private listeners: Map<string, WebSocketCallback[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(url: string = 'wss://api.weppo.co/v1/ws') {
        this.url = url;
    }

    connect(apiKey: string) {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.apiKey = apiKey;
        this.ws = new WebSocket(`${this.url}?apiKey=${apiKey}`);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('connected', true);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.emit(message.type, message.data);
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.emit('connected', false);
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                console.log('Attempting reconnect...');
                this.reconnectAttempts++;
                if (this.apiKey) this.connect(this.apiKey);
            }, 2000 * Math.pow(2, this.reconnectAttempts));
        }
    }

    subscribe(event: string, callback: WebSocketCallback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    unsubscribe(event: string, callback: WebSocketCallback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            this.listeners.set(
                event,
                callbacks.filter((cb) => cb !== callback)
            );
        }
    }

    private emit(event: string, data: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((cb) => cb(data));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const wsClient = new WebSocketClient();
