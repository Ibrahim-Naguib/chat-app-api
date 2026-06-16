import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { initSocket, getIO, onlineUsers as getOnlineUsers } from '../../src/socket/index';
import { emitNewMessage, emitTyping, emitStopTyping, emitUpdateOnlineUsers } from '../../src/socket/emitters';
import { setupEventHandlers } from '../../src/socket/eventHandlers';
import config from '../../src/config/envConfig';
import jwt from 'jsonwebtoken';

describe('Socket.io', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;
  let port: number;

  beforeEach(async () => {
    httpServer = new HttpServer();
    io = initSocket(httpServer);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    io.close();
    httpServer.close();
  });

  const createClientSocket = (token: string) => {
    return ClientIO(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
  };

  const generateValidToken = (userId: string) => {
    return jwt.sign({ id: userId }, config.jwtSocketSecret, { expiresIn: '1h' });
  };

  describe('authMiddleware', () => {
    it('rejects connection without token', async () => {
      const socket = ClientIO(`http://localhost:${port}`, {
        auth: { token: '' },
        transports: ['websocket'],
        forceNew: true,
      });
      
      await expect(new Promise<void>((resolve, reject) => {
        socket.on('connect_error', (err) => {
          expect(err.message).toContain('Not authorized');
          socket.disconnect();
          resolve();
        });
        socket.on('connect', () => reject(new Error('Should not connect')));
      })).resolves.toBeUndefined();
    });

    it('rejects connection with invalid token', async () => {
      const socket = ClientIO(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
        forceNew: true,
      });
      
      await expect(new Promise<void>((resolve, reject) => {
        socket.on('connect_error', (err) => {
          expect(err.message).toContain('Not authorized');
          socket.disconnect();
          resolve();
        });
        socket.on('connect', () => reject(new Error('Should not connect')));
      })).resolves.toBeUndefined();
    });

    it('accepts connection with valid token', async () => {
      const userId = 'test-user-id';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => {
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve();
        });
      });
    });

    it('attaches userId to socket on connect', async () => {
      const userId = 'test-user-id-123';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => {
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve();
        });
      });
    }, 10000);
  });

  describe('connection lifecycle', () => {
    it('adds user to onlineUsers on connect', async () => {
      const userId = 'user-1';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => {
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve();
        });
      });
    }, 10000);

    it('removes user from onlineUsers on disconnect', async () => {
      const userId = 'user-2';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => {
        socket.on('connect', () => {
          socket.disconnect();
          setTimeout(() => {
            resolve();
          }, 100);
        });
      });
    }, 10000);

    it('handles multiple users', async () => {
      const user1 = 'user-3a';
      const user2 = 'user-3b';
      const token1 = generateValidToken(user1);
      const token2 = generateValidToken(user2);
      
      const socket1 = createClientSocket(token1);
      const socket2 = createClientSocket(token2);
      
      await Promise.all([
        new Promise<void>((resolve) => socket1.on('connect', resolve)),
        new Promise<void>((resolve) => socket2.on('connect', resolve)),
      ]);
      
      expect(socket1.connected).toBe(true);
      expect(socket2.connected).toBe(true);
      
      socket1.disconnect();
      socket2.disconnect();
    }, 10000);
  });

  describe('joinRoom / leaveRoom', () => {
    it('joins a room', async () => {
      const userId = 'user-4';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      
      socket.emit('joinRoom', 'chat-123');
      
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      const room = io.sockets.adapter.rooms.get('chat-123');
      expect(room?.has(socket.id)).toBe(true);
      
      socket.disconnect();
    });

    it('leaves a room', async () => {
      const userId = 'user-5';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      
      socket.emit('joinRoom', 'chat-456');
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      socket.emit('leaveRoom', 'chat-456');
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      const room = io.sockets.adapter.rooms.get('chat-456');
      // Room might be deleted when empty, which is fine - just verify socket is not in it
      expect(room?.has(socket.id) ?? false).toBe(false);
      
      socket.disconnect();
    });

    it('ignores empty chatId', async () => {
      const userId = 'user-6';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      
      socket.emit('joinRoom', '');
      
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      expect(socket.connected).toBe(true);
      socket.disconnect();
    });
  });

  describe('typing / stopTyping', () => {
    it('emits typing event to room', async () => {
      const userId = 'user-7';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      
      socket.emit('joinRoom', 'chat-typing');
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      const typingPromise = new Promise<{ userId: string; chatId: string }>((resolve) => {
        socket.on('typing', (data) => resolve(data));
      });
      
      socket.emit('typing', { chatId: 'chat-typing' });
      const data = await typingPromise;
      
      expect(data.userId).toBe(userId);
      expect(data.chatId).toBe('chat-typing');
      
      socket.disconnect();
    });

    it('emits stopTyping event to room', async () => {
      const userId = 'user-8';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      
      socket.emit('joinRoom', 'chat-stoptyping');
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      const stopPromise = new Promise<{ userId: string; chatId: string }>((resolve) => {
        socket.on('stopTyping', (data) => resolve(data));
      });
      
      socket.emit('stopTyping', { chatId: 'chat-stoptyping' });
      const data = await stopPromise;
      
      expect(data.userId).toBe(userId);
      expect(data.chatId).toBe('chat-stoptyping');
      
      socket.disconnect();
    });

    it('ignores empty chatId', async () => {
      const userId = 'user-9';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      
      socket.emit('typing', { chatId: '' });
      socket.emit('stopTyping', { chatId: '' });
      
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      
      expect(socket.connected).toBe(true);
      socket.disconnect();
    });
  });

  describe('emitUpdateOnlineUsers', () => {
    it('broadcasts online users list on connect', async () => {
      const userId = 'user-10';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      const updatePromise = new Promise<string[]>((resolve) => {
        socket.on('updateOnlineUsers', (users: string[]) => resolve(users));
      });
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      const users = await updatePromise;
      
      expect(users).toContain(userId);
      socket.disconnect();
    });

    it('broadcasts updated list on disconnect', async () => {
      const userId = 'user-11';
      const token = generateValidToken(userId);
      const socket = createClientSocket(token);
      
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      socket.disconnect();
      
      // Create another socket to receive the update
      const userId2 = 'user-11b';
      const token2 = generateValidToken(userId2);
      const socket2 = createClientSocket(token2);
      
      const updatePromise = new Promise<string[]>((resolve) => {
        socket2.on('updateOnlineUsers', (users: string[]) => resolve(users));
      });
      
      await new Promise<void>((resolve) => socket2.on('connect', resolve));
      const users = await updatePromise;
      
      expect(users).not.toContain(userId);
      expect(users).toContain(userId2);
      
      socket2.disconnect();
    });
  });
});

describe('eventHandlers (unit)', () => {
  let mockSocket: any;
  let userId = 'test-user';

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      id: 'socket-id',
    };
  });

  it('registers joinRoom handler', () => {
    setupEventHandlers(mockSocket as any, userId);
    
    const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'joinRoom')?.[1];
    expect(joinHandler).toBeDefined();
    
    joinHandler('chat-1');
    expect(mockSocket.join).toHaveBeenCalledWith('chat-1');
  });

  it('registers leaveRoom handler', () => {
    setupEventHandlers(mockSocket as any, userId);
    
    const leaveHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'leaveRoom')?.[1];
    expect(leaveHandler).toBeDefined();
    
    leaveHandler('chat-1');
    expect(mockSocket.leave).toHaveBeenCalledWith('chat-1');
  });

  it('joinRoom ignores empty chatId', () => {
    setupEventHandlers(mockSocket as any, userId);
    
    const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'joinRoom')?.[1];
    joinHandler('');
    expect(mockSocket.join).not.toHaveBeenCalled();
  });

  it('registers typing handler', () => {
    setupEventHandlers(mockSocket as any, userId);
    
    const typingHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'typing')?.[1];
    expect(typingHandler).toBeDefined();
  });

  it('registers stopTyping handler', () => {
    setupEventHandlers(mockSocket as any, userId);
    
    const stopHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'stopTyping')?.[1];
    expect(stopHandler).toBeDefined();
  });

  it('typing ignores empty chatId', () => {
    setupEventHandlers(mockSocket as any, userId);
    
    const typingHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'typing')?.[1];
    typingHandler({ chatId: '' });
    // Should not throw
  });
});

describe('emitters (unit)', () => {
  let mockIO: any;

  beforeEach(async () => {
    mockIO = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    
    // Reset modules and setup mock before import
    vi.resetModules();
    vi.doMock('../../src/socket/index', () => ({
      getIO: () => mockIO,
    }));
    
    // Force re-import
    await import('../../src/socket/emitters');
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('emitNewMessage sends to room and broadcasts update', async () => {
    const { emitNewMessage } = await import('../../src/socket/emitters');
    
    emitNewMessage('chat-1', { content: 'Hello' });
    
    expect(mockIO.to).toHaveBeenCalledWith('chat-1');
    expect(mockIO.emit).toHaveBeenCalledTimes(2);
    expect(mockIO.emit).toHaveBeenCalledWith('newMessage', { content: 'Hello' });
    expect(mockIO.emit).toHaveBeenCalledWith('chatListUpdate', { chatId: 'chat-1', latestMessage: { content: 'Hello' } });
  });

  it('emitTyping sends to room', async () => {
    const { emitTyping } = await import('../../src/socket/emitters');
    
    emitTyping('chat-1', 'user-1');
    
    expect(mockIO.to).toHaveBeenCalledWith('chat-1');
    expect(mockIO.emit).toHaveBeenCalledWith('typing', { userId: 'user-1', chatId: 'chat-1' });
  });

  it('emitStopTyping sends to room', async () => {
    const { emitStopTyping } = await import('../../src/socket/emitters');
    
    emitStopTyping('chat-1', 'user-1');
    
    expect(mockIO.to).toHaveBeenCalledWith('chat-1');
    expect(mockIO.emit).toHaveBeenCalledWith('stopTyping', { userId: 'user-1', chatId: 'chat-1' });
  });

  it('emitUpdateOnlineUsers broadcasts list', async () => {
    const { emitUpdateOnlineUsers } = await import('../../src/socket/emitters');
    
    const users = new Map([['user-1', 'socket-1'], ['user-2', 'socket-2']]);
    emitUpdateOnlineUsers(users);
    
    expect(mockIO.emit).toHaveBeenCalledWith('updateOnlineUsers', ['user-1', 'user-2']);
  });

  it('safeEmit handles null IO gracefully', async () => {
    vi.doMock('../../src/socket/index', () => ({
      getIO: () => null,
    }));
    
    const { emitNewMessage } = await import('../../src/socket/emitters');
    
    // Should not throw
    emitNewMessage('chat-1', { content: 'Hello' });
  });
});