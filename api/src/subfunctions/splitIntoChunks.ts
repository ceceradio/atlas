import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'

export type TextChunk = {
  text: string
  embedding: number[]
}

// Segments that are more similar than this threshold get merged into one chunk
const MERGE_THRESHOLD = 0.82

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function splitIntoSegments(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export async function splitIntoChunks(text: string): Promise<TextChunk[]> {
  const segments = splitIntoSegments(text)
  if (segments.length === 0) return []

  const embeddings = await Promise.all(segments.map((s) => embedQwen(s)))

  // Greedy left-to-right merge: accumulate segments until similarity drops
  const mergedTexts: string[] = []
  const mergedIndices: number[][] = [] // which segment indices went into each chunk

  let groupStart = 0
  for (let i = 1; i < segments.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i])
    if (similarity < MERGE_THRESHOLD) {
      mergedTexts.push(segments.slice(groupStart, i).join(' '))
      mergedIndices.push(
        Array.from({ length: i - groupStart }, (_, k) => groupStart + k),
      )
      groupStart = i
    }
  }
  mergedTexts.push(segments.slice(groupStart).join(' '))
  mergedIndices.push(
    Array.from(
      { length: segments.length - groupStart },
      (_, k) => groupStart + k,
    ),
  )

  // Re-embed merged chunks; single-segment chunks reuse the already-computed embedding
  const finalEmbeddings = await Promise.all(
    mergedTexts.map((text, i) =>
      mergedIndices[i].length === 1
        ? Promise.resolve(embeddings[mergedIndices[i][0]])
        : embedQwen(text),
    ),
  )

  return mergedTexts.map((text, i) => ({ text, embedding: finalEmbeddings[i] }))
}
