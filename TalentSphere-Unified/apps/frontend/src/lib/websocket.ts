import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file' | 'image';
}

export interface WebSocketState {
  isConnected: boolean;
  error: string | null;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8096/ws/raw';

export const useChatWebSocket = (userId: string | null) => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    error: null,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!userId) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setState({ isConnected: true, error: null });
        ws.send(JSON.stringify({ type: 'JOIN', userId }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ChatMessage;
          setMessages((prev) => [...prev, message]);
        } catch {
          console.error('Failed to parse message:', event.data);
        }
      };

      ws.onerror = () => {
        setState((prev) => ({ ...prev, error: 'WebSocket error' }));
      };

      ws.onclose = () => {
        setState({ isConnected: false, error: null });
      };

      wsRef.current = ws;
    } catch {
      setState({ isConnected: false, error: 'Failed to connect' });
    }
  }, [userId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({ isConnected: false, error: null });
  }, []);

  const sendMessage = useCallback((receiverId: string, content: string, type: 'text' | 'file' | 'image' = 'text') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: userId!,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
        type,
      };
      wsRef.current.send(JSON.stringify(message));
      setMessages((prev) => [...prev, message]);
    }
  }, [userId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    messages,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};