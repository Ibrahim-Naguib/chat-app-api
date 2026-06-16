# Chat App API

Backend API for a real-time chat application built with Express, MongoDB, Socket.IO, and TypeScript. The project includes JWT authentication, direct and group chats, message read/edit flows, Cloudinary uploads, email-based password reset, and Swagger documentation.

## Features

- JWT-based auth with access, refresh, and socket tokens.
- Direct chats and group chats.
- Message sending, pagination, read receipts, and editing.
- Profile and group picture uploads through Cloudinary.
- Password reset flow with email verification.
- Swagger UI documentation served from the app.
- Vitest + Supertest route and service coverage.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- Socket.IO
- Zod validation
- Swagger UI
- Cloudinary
- Resend

## Getting Started

### Prerequisites

- Node.js 18+.
- pnpm.
- MongoDB connection string.

### Install

```bash
pnpm install
```

### Environment Variables

Create a `.env` file with the following values:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_SOCKET_SECRET=your_socket_secret
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=chat-app
RESEND_API_KEY=
```

The auth and socket secrets are required. Cloudinary and Resend are optional unless you want file uploads and email reset flows to work.

### Run Locally

```bash
pnpm dev
```

The server starts on `http://localhost:3000` by default.

## Scripts

- `pnpm dev` - start the app in watch mode.
- `pnpm build` - compile TypeScript to `dist`.
- `pnpm start` - run the compiled server.
- `pnpm typecheck` - run TypeScript without emitting files.
- `pnpm test` - run the test suite once.
- `pnpm test:watch` - run Vitest in watch mode.
- `pnpm test:coverage` - run tests with coverage.
- `pnpm lint` - lint the source and test files.
- `pnpm format` - format source and test files.
- `pnpm clean` - remove the build output.

## API Documentation

Swagger UI is available at:

- `/api-docs`
- `/api-docs.json`

## API Base Path

All working routes are mounted under a single base path:

- `/api/auth`
- `/api/messages`
- `/api/chats`
- `/api/users`

## Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/socket-token`
- `POST /api/auth/forgotPassword`
- `POST /api/auth/verifyResetCode`
- `PUT /api/auth/resetPassword`

### Users

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `POST /api/users/profile-picture`
- `DELETE /api/users/profile-picture`

### Chats

- `GET /api/chats`
- `POST /api/chats`
- `POST /api/chats/group`
- `PUT /api/chats/group/rename`
- `PUT /api/chats/group/add`
- `PUT /api/chats/group/remove`
- `POST /api/chats/group-picture`
- `DELETE /api/chats/group-picture`

### Messages

- `POST /api/messages`
- `GET /api/messages/chat/:chatId`
- `POST /api/messages/read/:chatId`
- `PUT /api/messages/:messageId`

## Testing

The repository uses MongoMemoryServer for isolated integration-style tests.

```bash
pnpm test
```

If you want a fast feedback loop while changing a single area, run the matching route file:

```bash
pnpm test -- tests/routes/auth.test.ts
```

## Project Structure

```text
src/
  app.ts
  config/
  controllers/
  docs/
  middleware/
  models/
  routes/
  services/
  socket/
  types/
  utils/
tests/
```
