import type { Request } from 'express';

export interface AuthPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}

export interface Pagination {
  page: number;
  limit: number;
  numberOfPages: number;
  next?: number;
  prev?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  _id: string;
  name: string;
  email: string;
  profilePicture: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

// Socket event types
export interface ServerToClientEvents {
  newMessage: (message: unknown) => void;
  chatListUpdate: (data: { chatId: string; latestMessage: unknown }) => void;
  typing: (data: { userId: string; chatId: string }) => void;
  stopTyping: (data: { userId: string; chatId: string }) => void;
  updateOnlineUsers: (userIds: string[]) => void;
  error: (error: { message: string }) => void;
}

export interface ClientToServerEvents {
  joinRoom: (chatId: string) => void;
  leaveRoom: (chatId: string) => void;
  typing: (data: { chatId: string }) => void;
  stopTyping: (data: { chatId: string }) => void;
}

export interface SocketAuth {
  token: string;
}

// Type guard for AuthenticatedRequest
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && typeof req.user === 'object' && req.user !== null && 'id' in req.user;
}
