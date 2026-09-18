export interface RedisConnection {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
}

type EnvGetter = (key: string) => string | undefined;

/**
 * Resuelve la conexión a Redis desde el entorno.
 * Prioridad: REDIS_URL (formato del .env.example y del compose) y, por
 * compatibilidad, REDIS_HOST / REDIS_PORT (/ REDIS_PASSWORD).
 */
export function resolveRedisConnection(get: EnvGetter): RedisConnection {
  const url = get('REDIS_URL');
  if (url) {
    const parsed = new URL(url);
    const dbPath = parsed.pathname.replace('/', '');
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      db: dbPath ? Number(dbPath) : undefined,
    };
  }
  return {
    host: get('REDIS_HOST') || 'localhost',
    port: Number(get('REDIS_PORT')) || 6379,
    password: get('REDIS_PASSWORD') || undefined,
  };
}
