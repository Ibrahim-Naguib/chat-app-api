import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createMultipleUsers, getAuthHeaders } from '../setup';

describe('Chat Routes', () => {
  describe('POST /api/chats', () => {
    it('creates a direct chat with another user', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com', name: 'User Two' });

      const res = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user1._id.toString()))
        .send({ email: 'user2@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.isGroupChat).toBe(false);
    });

    it('returns 400 when creating chat with yourself', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/chats').send({ email: 'test@example.com' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/chats', () => {
    it('returns user chats', async () => {
      const user = await createTestUser();
      const other = await createTestUser({ email: 'other@example.com', name: 'Other' });

      await request(app)
        .post('/api/chats')
        .set(getAuthHeaders(user._id.toString()))
        .send({ email: 'other@example.com' });

      const res = await request(app)
        .get('/api/chats')
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/chats/group', () => {
    it('creates a group chat', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(3);

      const res = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({
          name: 'Test Group',
          users: others.map(u => u.email),
        });

      expect(res.status).toBe(201);
      expect(res.body.isGroupChat).toBe(true);
      expect(res.body.chatName).toBe('Test Group');
    });

    it('requires at least 2 user emails', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Test Group', users: ['single@example.com'] });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/chats/group/rename', () => {
    it('renames group by admin', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Original', users: others.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/rename')
        .set(getAuthHeaders(user._id.toString()))
        .send({ chatId: group.body._id, chatName: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.chatName).toBe('Renamed');
    });

    it('returns 400 when non-admin tries to rename', async () => {
      const admin = await createTestUser();
      const members = await createMultipleUsers(3);
      const nonAdmin = members[0];

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(admin._id.toString()))
        .send({ name: 'Group', users: members.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/rename')
        .set(getAuthHeaders(nonAdmin._id.toString()))
        .send({ chatId: group.body._id, chatName: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/chats/group/add', () => {
    it('adds a user to group', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);
      const newMember = await createTestUser({ email: 'newmember@example.com', name: 'New Member' });

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Group', users: others.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/add')
        .set(getAuthHeaders(user._id.toString()))
        .send({ chatId: group.body._id, email: newMember.email });

      expect(res.status).toBe(200);
    });

    it('returns 400 when user already in group', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Group', users: others.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/add')
        .set(getAuthHeaders(user._id.toString()))
        .send({ chatId: group.body._id, email: others[0].email });

      expect(res.status).toBe(400);
    });

    it('returns 403 when non-admin tries to add', async () => {
      const admin = await createTestUser();
      const members = await createMultipleUsers(3);
      const nonAdmin = members[0];

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(admin._id.toString()))
        .send({ name: 'Group', users: members.map(u => u.email) });

      const newMember = await createTestUser({ email: 'new@example.com' });

      const res = await request(app)
        .put('/api/chats/group/add')
        .set(getAuthHeaders(nonAdmin._id.toString()))
        .send({ chatId: group.body._id, email: newMember.email });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/chats/group/remove', () => {
    it('removes a user from group', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Group', users: others.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/remove')
        .set(getAuthHeaders(user._id.toString()))
        .send({ chatId: group.body._id, userId: others[0]._id.toString() });

      expect(res.status).toBe(200);
    });

    it('returns 400 when admin tries to remove themselves', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Group', users: others.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/remove')
        .set(getAuthHeaders(user._id.toString()))
        .send({ chatId: group.body._id, userId: user._id.toString() });

      expect(res.status).toBe(400);
    });

    it('returns 400 when trying to remove group admin', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Group', users: others.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/remove')
        .set(getAuthHeaders(user._id.toString()))
        .send({ chatId: group.body._id, userId: user._id.toString() });

      expect(res.status).toBe(400);
    });

    it('returns 403 when non-admin tries to remove', async () => {
      const admin = await createTestUser();
      const members = await createMultipleUsers(3);
      const nonAdmin = members[1];

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(admin._id.toString()))
        .send({ name: 'Group', users: members.map(u => u.email) });

      const res = await request(app)
        .put('/api/chats/group/remove')
        .set(getAuthHeaders(nonAdmin._id.toString()))
        .send({ chatId: group.body._id, userId: members[0]._id.toString() });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/chats/group-picture', () => {
    it('returns 400 without image file', async () => {
      const user = await createTestUser();
      const others = await createMultipleUsers(2);

      const group = await request(app)
        .post('/api/chats/group')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Group', users: others.map(u => u.email) });

      const res = await request(app)
        .post('/api/chats/group-picture')
        .set(getAuthHeaders(user._id.toString()))
        .field('chatId', group.body._id);

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/chats/group-picture', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/chats/group-picture')
        .send({ chatId: 'test-id' });

      expect(res.status).toBe(401);
    });
  });
});
