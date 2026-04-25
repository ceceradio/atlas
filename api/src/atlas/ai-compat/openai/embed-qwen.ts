import OpenAI from 'openai'

const VLLM_HOST = process.env.VLLM_HOST || 'host.docker.internal'

const client = new OpenAI({
  baseURL: `http://${VLLM_HOST}:8002/v1`,
  apiKey: 'none',
})

const MODEL = 'Qwen/Qwen3-Embedding-0.6B'
export async function embedQwen(input: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: MODEL,
    input: `Instruct: Given the name of a chore as a query, find similar chores using that query.\nQuery: ${input}`,
  })
  return response.data[0].embedding
}
