import { getDataSource } from '@/data-source'
import express from 'express'

export const dbMiddleware: express.Handler = async (_req, res, next) => {
  const qr = (await getDataSource()).createQueryRunner()
  res.locals.db = qr.manager

  const cleanup = () => {
    if (!qr.isReleased && !qr.isTransactionActive) qr.release()
  }
  res.on('finish', cleanup)
  res.on('error', cleanup)
  res.on('close', cleanup)

  next()
}

export function withTransaction(handler: express.Handler): express.Handler {
  return async (req, res, next) => {
    try {
      await (
        await getDataSource()
      ).transaction(async (manager) => {
        res.locals.db = manager
        await (handler(req, res, next) as unknown as Promise<void>)
      })
    } catch (err) {
      next(err)
    }
  }
}
