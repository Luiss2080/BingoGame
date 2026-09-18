import { describe, expect, it } from 'vitest';
import { resolveRedisConnection } from './redis-connection';

const env = (vars: Record<string, string>) => (k: string) => vars[k];

describe('resolveRedisConnection', () => {
  it('usa localhost:6379 por defecto', () => {
    expect(resolveRedisConnection(env({}))).toMatchObject({ host: 'localhost', port: 6379 });
  });

  it('lee REDIS_URL (formato del .env.example)', () => {
    expect(resolveRedisConnection(env({ REDIS_URL: 'redis://redis:6380' }))).toMatchObject({
      host: 'redis',
      port: 6380,
    });
  });

  it('extrae contraseña y base de datos de REDIS_URL', () => {
    const c = resolveRedisConnection(env({ REDIS_URL: 'redis://:s3%40cr@cache:6379/2' }));
    expect(c).toMatchObject({ host: 'cache', port: 6379, password: 's3@cr', db: 2 });
  });

  it('sigue aceptando REDIS_HOST/REDIS_PORT', () => {
    expect(
      resolveRedisConnection(env({ REDIS_HOST: 'r.local', REDIS_PORT: '6400' })),
    ).toMatchObject({ host: 'r.local', port: 6400 });
  });

  it('REDIS_URL tiene prioridad sobre REDIS_HOST', () => {
    const c = resolveRedisConnection(env({ REDIS_URL: 'redis://a:1', REDIS_HOST: 'b' }));
    expect(c.host).toBe('a');
  });
});
