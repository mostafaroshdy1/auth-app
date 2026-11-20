import { getConnectionToken } from '@nestjs/mongoose';
import { type NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { Redis } from 'ioredis';
import { AppModule } from '../src/app.module.js';
import { REDIS } from '../src/infrastructure/redis/redis.module.js';
import { setupApp } from '../src/setup.js';
import { clearTestKeys, dropTestDatabase } from './support/isolation.js';

describe('Auth (e2e)', () => {
  let app: NestNodeApplication;
  const password = 'Passw0rd!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = setupApp(
      moduleRef.createNestApplication<NestNodeApplication>(new NodeAdapter()),
    );
    await app.init();
    const connection = app.get<Connection>(getConnectionToken());
    await dropTestDatabase(connection);
    await Promise.all(
      Object.values(connection.models).map((model) => model.syncIndexes()),
    );
  });

  beforeEach(() => clearTestKeys(app.get<Redis>(REDIS)));

  afterAll(async () => {
    await dropTestDatabase(app.get<Connection>(getConnectionToken()));
    await clearTestKeys(app.get<Redis>(REDIS));
    await app.close();
  });

  const cookieValue = (res: request.Response, name: string) => {
    const header = res.headers['set-cookie'] as unknown as string[] | undefined;
    const cookie = header?.find((value) => value.startsWith(`${name}=`));
    return cookie?.slice(name.length + 1).split(';')[0];
  };

  const signUp = (email: string, isAdmin = false) => {
    const agent = request.agent(app.getHttpServer());
    return agent
      .post('/api/auth/sign-up')
      .send({ email, name: 'Test User', password, isAdmin })
      .expect(201)
      .then((res) => ({
        agent,
        user: res.body as { id: string; passwordHash?: string },
        refreshToken: cookieValue(res, 'refresh')!,
      }));
  };

  const refreshWith = (token: string) =>
    request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `refresh=${token}`);

  it('signs up, reads the profile and signs out', async () => {
    const { agent, user } = await signUp('user@example.com');
    expect(user.passwordHash).toBeUndefined();

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect((res) => expect(res.body.email).toBe('user@example.com'));
    await agent.post('/api/auth/sign-out').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rotates the refresh token and keeps the session alive', async () => {
    const { agent, refreshToken } = await signUp('rotate@example.com');

    const res = await refreshWith(refreshToken).expect(204);
    const rotated = cookieValue(res, 'refresh');
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(refreshToken);
    expect(cookieValue(res, 'access')).toBeDefined();

    await refreshWith(rotated!).expect(204);
    await agent.get('/api/auth/me').expect(200);
  });

  it('revokes the whole session when a used refresh token is replayed', async () => {
    const { agent, refreshToken } = await signUp('replay@example.com');
    const rotated = cookieValue(
      await refreshWith(refreshToken).expect(204),
      'refresh',
    )!;

    const replay = await refreshWith(refreshToken).expect(401);
    expect(cookieValue(replay, 'refresh')).toBe('');

    await refreshWith(rotated).expect(401);
    await agent.get('/api/auth/me').expect(401);
  });

  it('lets only one of two concurrent refreshes with the same token win', async () => {
    const { refreshToken } = await signUp('race@example.com');
    const statuses = (
      await Promise.all([refreshWith(refreshToken), refreshWith(refreshToken)])
    ).map((r) => r.status);
    expect(statuses.toSorted((a, b) => a - b)).toEqual([204, 401]);
  });

  it('rejects a refresh with an access token or no cookie', async () => {
    const { agent } = await signUp('wrongtoken@example.com');
    const res = await agent
      .post('/api/auth/sign-in')
      .send({ email: 'wrongtoken@example.com', password })
      .expect(200);
    await refreshWith(cookieValue(res, 'access')!).expect(401);
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await signUp('dup@example.com');
    await request(app.getHttpServer())
      .post('/api/auth/sign-up')
      .send({ email: 'DUP@example.com', name: 'Test User', password })
      .expect(409);
  });

  it('rejects invalid payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/sign-up')
      .send({ email: 'bad', name: 'ab', password: 'weak' })
      .expect(400);
  });

  it('rejects wrong credentials with a generic message', async () => {
    await signUp('creds@example.com');
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({ email: 'creds@example.com', password: 'Wrong0ne!' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('revokes other sessions immediately', async () => {
    const { agent } = await signUp('multi@example.com');
    const other = request.agent(app.getHttpServer());
    await other
      .post('/api/auth/sign-in')
      .send({ email: 'multi@example.com', password })
      .expect(200);

    const sessions = await agent.get('/api/sessions').expect(200);
    expect(sessions.body).toHaveLength(2);
    const otherId = (sessions.body as { id: string; current: boolean }[]).find(
      (s) => !s.current,
    )!.id;

    await agent.delete('/api/sessions').expect(200, { revoked: 1 });
    const redis = app.get<Redis>(REDIS);
    await expect(redis.get(`session:${otherId}`)).resolves.toBe('revoked');
    const ttl = await redis.ttl(`session:${otherId}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(
      Number(process.env.SESSION_TTL_SECONDS ?? 604800),
    );
    await other.get('/api/auth/me').expect(401);
    await agent.get('/api/auth/me').expect(200);
  });

  it('guards admin routes by permission and applies changes to live sessions', async () => {
    const { agent: admin } = await signUp('admin@example.com', true);
    const { agent: member, user } = await signUp('member@example.com');

    await member.get('/api/admin/users').expect(403);
    const list = await admin.get('/api/admin/users').expect(200);
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash|scrypt/);

    await admin
      .patch(`/api/admin/users/${user.id}/permissions`)
      .send({ permissions: ['users:read'] })
      .expect(200);
    await member.get('/api/admin/users').expect(200);
  });
});
