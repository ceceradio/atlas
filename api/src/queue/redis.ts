import * as Redis from 'ioredis'

export const redisConfig: Redis.RedisOptions = {
  host: process.env.REDIS_HOST || 'host.docker.internal',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
}
