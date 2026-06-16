import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createMultipleUsers, getAuthHeaders } from '../setup';

describe('Message Routes', () => {
  describe('POST /api/messages', () => {
    it('sends a message in a chat', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      expect(chat.status).toBe(201);

      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Hello!', chatId: chat.body._id });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Hello!');
      expect(res.body.sender).toHaveProperty('_id');
    });

    it('returns 400 for empty content', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: '', chatId: chat.body._id });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/messages/chat/:chatId', () => {
    it('returns paginated messages', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Msg 1', chatId: chat.body._id });

      await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Msg 2', chatId: chat.body._id });

      const res = await request(app)
        .get(`/api/messages/chat/${chat.body._id}`)
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('numberOfPages');
    });

    it('returns 400 for invalid chatId', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .get('/api/messages/chat/invalidid')
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/messages/read/:chatId', () => {
    it('marks messages as read', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      // Other user sends messages
      const msg1 = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(other._id.toString()))
        .send({ content: 'Msg from other 1', chatId: chat.body._id });

      const msg2 = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(other._id.toString()))
        .send({ content: 'Msg from other 2', chatId: chat.body._id });

      expect(msg1.status).toBe(201);
      expect(msg2.status).toBe(201);

      // User marks messages as read
      const res = await request(app)
        .post(`/api/messages/read/${chat.body._id}`)
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify messages have readBy for this user
      const messagesRes = await request(app)
        .get(`/api/messages/chat/${chat.body._id}`)
        .set(getAuthHeaders(user._id.toString()));

      expect(messagesRes.status).toBe(200);
      // Both messages should now have readBy entry for user
      messagesRes.body.messages.forEach((msg: any) => {
        expect(msg.readBy).toBeDefined();
        const userRead = msg.readBy.find((r: any) => r.user === user._id.toString());
        expect(userRead).toBeDefined();
        expect(userRead.readAt).toBeDefined();
      });
    });

    it('does not mark own messages as read', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      // User sends a message
      await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'My own message', chatId: chat.body._id });

      // Other sends a message
      await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(other._id.toString()))
        .send({ content: 'Other message', chatId: chat.body._id });

      // User marks as read
      const res = await request(app)
        .post(`/api/messages/read/${chat.body._id}`)
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(200);

      // Verify only other's message has readBy for user
      const messagesRes = await request(app)
        .get(`/api/messages/chat/${chat.body._id}`)
        .set(getAuthHeaders(user._id.toString()));

      expect(messagesRes.status).toBe(200);
      
      const userMessages = messagesRes.body.messages.filter((msg: any) => msg.sender._id === user._id.toString());
      const otherMessages = messagesRes.body.messages.filter((msg: any) => msg.sender._id === other._id.toString());
      
      // User's own message should NOT have readBy for user
      userMessages.forEach((msg: any) => {
        const userRead = msg.readBy?.find((r: any) => r.user === user._id.toString());
        expect(userRead).toBeUndefined();
      });

      // Other's message SHOULD have readBy for user
      otherMessages.forEach((msg: any) => {
        const userRead = msg.readBy.find((r: any) => r.user === user._id.toString());
        expect(userRead).toBeDefined();
      });
    });

    it('returns 401 without auth', async () => {
      const user = await createTestUser();

      const res = await request(app).post(`/api/messages/read/${user._id}`);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid chatId', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/messages/read/invalidid')
        .set(getAuthHeaders(user._id.toString()));
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/messages/:messageId', () => {
    it('edits own message', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      // User sends a message
      const msgRes = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Original message', chatId: chat.body._id });

      expect(msgRes.status).toBe(201);
      const messageId = msgRes.body._id;

      // Edit the message
      const editRes = await request(app)
        .put(`/api/messages/${messageId}`)
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Edited message' });

      expect(editRes.status).toBe(200);
      expect(editRes.body.content).toBe('Edited message');
      expect(editRes.body.isEdited).toBe(true);
      expect(editRes.body.editedAt).toBeDefined();

      // Verify the edit is reflected in chat messages
      const messagesRes = await request(app)
        .get(`/api/messages/chat/${chat.body._id}`)
        .set(getAuthHeaders(user._id.toString()));

      expect(messagesRes.status).toBe(200);
      const editedMessage = messagesRes.body.messages.find((m: any) => m._id === messageId);
      expect(editedMessage.content).toBe('Edited message');
      expect(editedMessage.isEdited).toBe(true);
    });

    it('returns 403 when editing another user message', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      // Other user sends a message
      const msgRes = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(other._id.toString()))
        .send({ content: 'Others message', chatId: chat.body._id });

      expect(msgRes.status).toBe(201);
      const messageId = msgRes.body._id;

      // User tries to edit other's message
      const editRes = await request(app)
        .put(`/api/messages/${messageId}`)
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Hacked message' });

      expect(editRes.status).toBe(403);
    });

    it('returns 400 for empty content', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      const msgRes = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Original', chatId: chat.body._id });

      const editRes = await request(app)
        .put(`/api/messages/${msgRes.body._id}`)
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: '' });

      expect(editRes.status).toBe(400);
    });

    it('returns 404 for non-existent message', async () => {
      const user = await createTestUser();
      const fakeMessageId = '507f1f77bcf86cd799439011';

      const editRes = await request(app)
        .put(`/api/messages/${fakeMessageId}`)
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'New content' });

      expect(editRes.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      const chat = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      const msgRes = await request(app)
        .post('/api/messages')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Original', chatId: chat.body._id });

      const editRes = await request(app)
        .put(`/api/messages/${msgRes.body._id}`)
        .send({ content: 'Edited' });

      expect(editRes.status).toBe(401);
    });

    it('returns 400 for invalid messageId', async () => {
      const user = await createTestUser();

      const editRes = await request(app)
        .put('/api/messages/invalidid')
        .set(getAuthHeaders(user._id.toString()))
        .send({ content: 'Edited' });

      expect(editRes.status).toBe(400);
    });
  });
});
