import Langfuse from 'langfuse'

export function getLangfuse(): Langfuse {
  const langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL ?? 'https://us.cloud.langfuse.com',
  })
  if (process.env.LANGFUSE_DEBUG === 'true') langfuse.debug()
  return langfuse
}
