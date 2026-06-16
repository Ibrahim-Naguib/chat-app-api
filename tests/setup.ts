import { beforeAll, afterEach, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import config from '../src/config/envConfig';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

export const createTestUser = async (overrides: Partial<{
  name: string;
  email: string;
  password: string;
}> = {}) => {
  const data = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    ...overrides,
  };

  const user = await User.create(data);
  return user;
};

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwtAccessSecret, { expiresIn: '15m' });
};

export const getAuthHeaders = (userId: string): Record<string, string> => ({
  Authorization: `Bearer ${generateAccessToken(userId)}`,
});

export const createMultipleUsers = async (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await User.create({
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      password: 'password123',
    });
    users.push(user);
  }
  return users;
};
