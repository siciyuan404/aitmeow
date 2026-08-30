type MessageHandler = (data: unknown) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect(port: number): void {
    this.shouldReconnect = true;
    this.url = `ws://127.0.0.1:${port}/ws/preview`;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.emit('connected', null);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type || 'message', data);
      } catch {
        this.emit('raw', event.data);
      }
    };
    this.ws.onclose = () => {
      this.emit('disconnected', null);
      if (this.shouldReconnect) this.scheduleReconnect();
    };
    this.ws.onerror = () => this.emit('error', null);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.createConnection(), 3000);
  }

  send(type: string, payload?: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...(payload as object || {}) }));
    }
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private emit(event: string, data: unknown): void {
    if (!event) return;
    this.dispatch(event, data);
    // 服务端事件名是 snake_case（serde rename_all），前端历史上按 PascalCase 订阅，
    // 这里同时派发两种写法，避免改名导致监听永远收不到。
    const pascal = toPascalCase(event);
    if (pascal !== event) this.dispatch(pascal, data);
  }

  private dispatch(event: string, data: unknown): void {
    this.handlers.get(event)?.slice().forEach((h) => h(data));
  }
}

function toPascalCase(value: string): string {
  return value
    .replace(/_([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}

export const wsClient = new WebSocketClient();
