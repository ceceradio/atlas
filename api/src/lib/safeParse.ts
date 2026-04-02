export function safeParse(data: string | null): string[] {
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch (error) {
    console.error('Error parsing data:', error)
    return []
  }
}
export type RSSHeadline = {
  id: string
  title: string
  description: string
  link: string
  author?: string
  published: number
  created: number
  category: string[]
  content?: string
}
