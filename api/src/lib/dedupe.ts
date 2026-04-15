/**
 * De-duplicate items from an array.
 * @param array
 * @returns
 */
export const dedupe = <T>(array: T[]) => Array.from(new Set(array))
export function deduplicateById<T>(array: T[], keyFn: (t: T) => string) {
  const deduplicated = new Map<string, T>()
  array.forEach((item) => {
    if (!deduplicated.has(keyFn(item))) deduplicated.set(keyFn(item), item)
  })
  return Array.from(deduplicated.values())
}
