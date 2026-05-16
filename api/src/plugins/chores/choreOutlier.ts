import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'

const CLUSTER_SIMILARITY_THRESHOLD = 0.80

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function computeCentroid(embeddings: number[][]): number[] {
  const dim = embeddings[0].length
  const c = new Array(dim).fill(0)
  for (const e of embeddings) {
    for (let i = 0; i < dim; i++) c[i] += e[i]
  }
  for (let i = 0; i < dim; i++) c[i] /= embeddings.length
  return c
}

type Cluster = { chores: string[]; embeddings: number[][]; centroid: number[] }

function greedyCluster(chores: string[], embeddings: number[][]): Cluster[] {
  const clusters: Cluster[] = []

  for (let i = 0; i < chores.length; i++) {
    const emb = embeddings[i]
    let bestCluster = -1
    let bestSim = -1

    for (let c = 0; c < clusters.length; c++) {
      const sim = cosineSimilarity(emb, clusters[c].centroid)
      if (sim > bestSim) {
        bestSim = sim
        bestCluster = c
      }
    }

    if (bestSim >= CLUSTER_SIMILARITY_THRESHOLD) {
      const cl = clusters[bestCluster]
      cl.chores.push(chores[i])
      cl.embeddings.push(emb)
      cl.centroid = computeCentroid(cl.embeddings)
    } else {
      clusters.push({ chores: [chores[i]], embeddings: [emb], centroid: emb })
    }
  }

  return clusters
}

/**
 * Returns chores from the smallest clusters — these are the outliers most unlike
 * the rest of that person's week. Pass the result to an LLM to pick the funniest.
 *
 * Expects chores WITH repetitions (not deduped) so that frequency is reflected in
 * cluster size: "cooked dinner" logged 7 times forms a large cluster and is never
 * an outlier, while a one-off weird chore stays a singleton.
 */
export async function findOutlierChoreCandidates(chores: string[]): Promise<string[]> {
  if (chores.length === 0) return []
  if (chores.length <= 2) return [...new Set(chores)]

  // Embed each unique description once, then expand back for clustering
  const unique = [...new Set(chores)]
  const uniqueEmbeddings = await Promise.all(unique.map((c) => embedQwen(c)))
  const embeddingByChore = new Map(unique.map((c, i) => [c, uniqueEmbeddings[i]]))
  const embeddings = chores.map((c) => embeddingByChore.get(c)!)

  const clusters = greedyCluster(chores, embeddings)

  // Sort ascending by cluster size, take up to 3 smallest
  const sorted = clusters.slice().sort((a, b) => a.chores.length - b.chores.length)
  const outlierClusters = sorted.slice(0, 3)

  // Deduplicate: the LLM pick list should show each description once
  return [...new Set(outlierClusters.flatMap((cl) => cl.chores))]
}
