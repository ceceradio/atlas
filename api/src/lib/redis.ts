import Redis from 'ioredis'
import { redisConfig } from '@/queue/redis'

let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) client = new Redis(redisConfig)
  return client
}
