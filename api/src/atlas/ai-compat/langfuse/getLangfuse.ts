import Langfuse from 'langfuse'

let instance: Langfuse | null = null

export function getLangfuse(): Langfuse {
  if (!instance) {
    instance = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASEURL ?? 'https://us.cloud.langfuse.com',
    })
    if (process.env.LANGFUSE_DEBUG === 'true') instance.debug()
  }
  return instance
}
