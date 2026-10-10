import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor.js';

describe('PlanForge API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health & Root (/api)', () => {
    it('GET /api should return Hello World with success wrapper', async () => {
      const res = await request(app.getHttpServer()).get('/api').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe('Hello World!');
    });
  });

  describe('Authentication (/api/auth)', () => {
    it('POST /api/auth/login should fail with invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@planforge.dev', password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid credentials/i);
    });

    it('POST /api/auth/login should succeed and return JWT tokens for admin (OWNER)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@planforge.dev', password: 'password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@planforge.dev');

      adminToken = res.body.data.accessToken;
      adminUserId = res.body.data.user.id;
    });

    it('POST /api/auth/login should succeed for member (MEMBER)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'jane@planforge.dev', password: 'password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('jane@planforge.dev');

      memberToken = res.body.data.accessToken;
    });

    it('GET /api/auth/profile should return 401 Unauthorized without token', async () => {
      await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('GET /api/auth/profile should return current user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@planforge.dev');
    });
  });

  describe('Workspaces (/api/workspaces)', () => {
    it('GET /api/workspaces should return workspaces for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Projects (/api/projects)', () => {
    it('GET /api/projects should return paginated list of projects', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.meta).toBeDefined();
    });
  });

  describe('Tasks (/api/tasks)', () => {
    it('GET /api/tasks should return paginated tasks list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.meta).toBeDefined();
    });

    it('GET /api/tasks?priorities=HIGH should return filtered tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks?priorities=HIGH')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      for (const task of res.body.data.items) {
        expect(task.priority).toBe('HIGH');
      }
    });
  });

  describe('RBAC Authorization Boundary Checks', () => {
    it('Member (Jane) should be forbidden from deactivating or updating Admin/Owner', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /cannot deactivate|insufficient permissions/i,
      );
    });

    it('Admin should be forbidden from deactivating the workspace OWNER', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot deactivate workspace owner/i);
    });
  });
});
