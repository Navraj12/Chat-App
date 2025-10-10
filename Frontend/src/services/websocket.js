class WebSocketService {
    constructor() {
        this.ws = null;
        this.listeners = {};
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:5000');

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                // Authenticate
                this.send({ type: 'auth', token });
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);

                if (message.type === 'auth_success') {
                    resolve(message);
                }

                // Notify listeners
                if (this.listeners[message.type]) {
                    this.listeners[message.type].forEach(callback => callback(message));
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
            };
        });
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    sendMessage(content) {
        this.send({
            type: 'chat_message',
            content,
            room: 'general'
        });
    }

    sendTyping(isTyping) {
        this.send({
            type: 'typing',
            isTyping
        });
    }

    on(eventType, callback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
    }

    off(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType] = this.listeners[eventType].filter(
                cb => cb !== callback
            );
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export default new WebSocketService();