import { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (error) {
    if (error instanceof AtlasError) {
      console.error(error)
      // @todo too much info, need to narrow
      const { message, stack, name } = error
      return response.status(400).json({ name, message, stack })
    } else next(error)
  }
}

export class AtlasError extends Error {
  isAtlas: true
}
