import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:8000';

let socket;

export const initiateSocketConnection = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false
    });
  }
  
  if (!socket.connected) {
    socket.connect();
    console.log('Socket.io connected');
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log('Socket.io disconnected');
  }
};

export const getSocket = () => socket;
