import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createMultipleUsers, getAuthHeaders } from '../setup';

describe('User Routes', () => {
  describe('GET /api/users/profile', () => {
    it('returns user profile', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test User');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('updates user name', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .put('/api/users/profile')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('updates password with correct current password', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .put('/api/users/profile')
        .set(getAuthHeaders(user._id.toString()))
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' });

      expect(res.status).toBe(200);
    });

    it('returns 400 with only one password field', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .put('/api/users/profile')
        .set(getAuthHeaders(user._id.toString()))
        .send({ currentPassword: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when current password is incorrect', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .put('/api/users/profile')
        .set(getAuthHeaders(user._id.toString()))
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword456' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when name is too short', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .put('/api/users/profile')
        .set(getAuthHeaders(user._id.toString()))
        .send({ name: 'A' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/users/profile-picture', () => {
    it('returns 400 without file', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/users/profile-picture')
        .set(getAuthHeaders(user._id.toString()));

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/users/profile-picture');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/users/profile-picture', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/users/profile-picture');
      expect(res.status).toBe(401);
    });
  });
});
