export function filterUndefinedProps(o: object) {
  return Object.fromEntries(
    Object.entries(o).filter(([_, v]) => v !== undefined),
  )
}
