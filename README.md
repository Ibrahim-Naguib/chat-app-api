# Backend API Endpoints

## Table of Contents

- [Authentication Routes](#authentication-routes-apiauth)
- [User Routes](#user-routes-apiusers)
- [Chat Routes](#chat-routes-apichats)
- [Message Routes](#message-routes-apimessages)
- [Static File Routes](#static-file-routes)

---

## Authentication Routes (/api/auth)

### 📮 `POST /api/auth/signup` — User Registration

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

### 📮 `POST /api/auth/login` — User Login

```json
{
  "email": "string",
  "password": "string"
}
```

### 🔒 `POST /api/auth/refresh` — Refresh JWT Token

```json
{}
```

### 🔒 `POST /api/auth/logout` — User Logout

```json
{}
```

### 📮 `POST /api/auth/forgotPassword` — Request Password Reset

```json
{
  "email": "string"
}
```

### 📮 `POST /api/auth/verifyResetCode` — Verify Password Reset Code

```json
{
  "resetCode": "string",
  "email": "string"
}
```

### 📮 `PUT /api/auth/resetPassword` — Reset User Password

```json
{
  "newPassword": "string",
  "email": "string"
}
```

---

## User Routes (/api/users)

### 🌐 `GET /api/users/profiles/:filename` — Get Profile Picture

#### Path Parameters

```ts
filename: string; // e.g., "user-id-timestamp.png"
```

### 🔒 `GET /api/users/profile` — Get User Profile

```json
{}
```

### 🔒🖼️ `POST /api/users/profile-picture` — Upload Profile Picture

#### FormData

```ts
image: File; // image file - jpeg, jpg, png, gif
```

### 🔒 `DELETE /api/users/profile-picture` — Remove Profile Picture

```json
{}
```

### 🔒 `PUT /api/users/profile` — Update User Profile

```json
{
  "name": "string", // optional
  "currentPassword": "string", // optional - required if updating password
  "newPassword": "string" // optional - required if updating password
}
```

---

## Chat Routes (/api/chats)

### 🌐 `GET /api/chats/groups/:filename` — Get Group Picture

#### Path Parameters

```ts
filename: string; // e.g., "chat-id-timestamp.png"
```

### 🔒 `GET /api/chats` — Get All User Chats

```json
{}
```

### 🔒 `POST /api/chats` — Access/Create One-on-One Chat

```json
{
  "email": "string" // target user's email
}
```

### 🔒 `DELETE /api/chats` — Delete Chat

```json
{
  "chatId": "string"
}
```

### 🔒 `POST /api/chats/group` — Create Group Chat

```json
{
  "name": "string",
  "users": ["string"] // array of email addresses, min 2 users
}
```

### 🔒 `PUT /api/chats/group/rename` — Rename Group Chat

```json
{
  "chatId": "string",
  "chatName": "string"
}
```

### 🔒 `PUT /api/chats/group/add` — Add User to Group

```json
{
  "chatId": "string",
  "email": "string"
}
```

### 🔒 `PUT /api/chats/group/remove` — Remove User from Group

```json
{
  "chatId": "string",
  "userId": "string"
}
```

### 🔒 `PUT /api/chats/group/leave` — Leave Group Chat

```json
{
  "chatId": "string"
}
```

### 🔒🖼️ `POST /api/chats/group-picture` — Upload Group Picture

#### FormData

```ts
image: File; // image file - jpeg, jpg, png, gif
chatId: string;
```

### 🔒 `DELETE /api/chats/group-picture` — Remove Group Picture

```json
{
  "chatId": "string"
}
```

---

## Message Routes (/api/messages)

### 🔒 `POST /api/messages` — Send Message

```json
{
  "content": "string",
  "chatId": "string"
}
```

### 🔒 `GET /api/messages/chat/:chatId` — Get Messages for Chat

#### Path Parameters

```ts
chatId: string;
```

#### Query Parameters (optional)

```ts
page: number; // default: 1
limit: number; // default: 10
```

---

## Static File Routes

### 🌐 `GET /profiles/:filename` — Serve Profile Pictures

#### Path Parameters

```ts
filename: string;
```

### 🌐 `GET /groups/:filename` — Serve Group Pictures

#### Path Parameters

```ts
filename: string;
```
