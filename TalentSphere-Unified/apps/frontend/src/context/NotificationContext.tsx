import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { useToast } from './ToastContext';
import { io } from 'socket.io-client';

interface Socket {
  on: (event: string, callback: (...args: any[]) => void) => void;
  disconnect: () => void;
  id?: string;
}

interface NotificationPayload {
  topic: string;
  payload: any;
}

interface NotificationContextType {
  socket: Socket | null;
  notifications: NotificationPayload[];
  unreadCount: number;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAppSelector((state) => state.auth);
  const token = session?.access_token;
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '') 
      : 'http://localhost:8080';

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to notification socket:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification socket');
    });

    newSocket.on('notification', (payload: NotificationPayload) => {
      setNotifications((prev) => [payload, ...prev]);
      setUnreadCount((prev) => prev + 1);
      showToast('info', payload.payload?.message || 'New notification');
    });
    
    newSocket.on('direct_message', (payload: any) => {
      setNotifications((prev) => [{ topic: 'user.message.sent', payload }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on('broadcast', (payload: NotificationPayload) => {
      setNotifications((prev) => [payload, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, showToast]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ socket, notifications, unreadCount, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};