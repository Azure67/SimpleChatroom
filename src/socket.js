import io from 'socket.io-client';

const IP = import.meta.env.VITE_IP;
const PORT = import.meta.env.VITE_PORT;

let socket = null;
let hasJoined = false;

export const initSocket = () => {
  if (socket) {
    socket.close();
  }
  
  socket = io(`http://${IP}:${PORT}/groupChat`, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false,
    auth: {
      username: localStorage.getItem('username')
    }
  });

  socket.on('connect', () => {
    const username = localStorage.getItem('username');
    if (username && !hasJoined) {
      socket.emit('newUserJoin', { username });
      hasJoined = true;
    }
  });

  socket.on('disconnect', () => {
    hasJoined = false;
  });
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    socket = initSocket();
    if (localStorage.getItem('username')) {
      socket.connect();
    }
  }
  return socket;
};

export const resetSocketState = () => {
  hasJoined = false;
};

export default {
  emit: (...args) => getSocket().emit(...args),
  on: (...args) => getSocket().on(...args),
  off: (...args) => getSocket().off(...args),
  close: () => socket?.close(),
  connect: () => getSocket().connect(),
  disconnect: () => {
    hasJoined = false;
    socket?.disconnect();
  },
  resetState: resetSocketState
};