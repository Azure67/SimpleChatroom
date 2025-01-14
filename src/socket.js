import io from 'socket.io-client';

const IP = "192.168.149.56";
const PORT = "3000";

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
  
  // 添加重连成功的处理
  socket.on('connect', () => {
    const username = localStorage.getItem('username');
    if (username && !hasJoined) {
      socket.emit('newUserJoin', { username });
      hasJoined = true;
    }
  });
  
  // 断开连接时重置标记
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

// 添加重置方法
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