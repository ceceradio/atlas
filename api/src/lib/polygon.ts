import { restClient } from '@polygon.io/client-js'
export const polygon = restClient(process.env.POLYGON_API_KEY)
