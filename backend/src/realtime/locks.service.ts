import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { resolveRedisConnection } from '../common/redis-connection';

@Injectable()
export class LocksService {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(resolveRedisConnection((k) => this.config.get<string>(k)));
  }

  async acquireLock(key: string, owner: string, ttlSeconds: number): Promise<boolean> {
    // SET key owner NX EX ttlSeconds
    const result = await this.redis.set(key, owner, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, owner: string): Promise<boolean> {
    // Script LUA para asegurar que solo el dueño puede liberar el lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, key, owner);
    return result === 1;
  }
}
