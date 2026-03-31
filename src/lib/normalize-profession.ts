/**
 * Normalize Spanish profession strings for grouping.
 *
 * Handles gender variants by stripping the trailing vowel (a/o) from
 * the first word, so "Abogado" and "Abogada" both become "abogad".
 * Neutral suffixes (-ista, -ante, -ente) are left untouched.
 */
export function normalizeProfession(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (!s) return s
  const words = s.split(/\s+/)
  const first = words[0] ?? ''
  // Neutral endings — don't strip
  if (/(ista|ante|ente)$/.test(first)) return words.join(' ')
  // Strip gender suffix from first word
  words[0] = first.replace(/[ao]$/, '')
  return words.join(' ')
}

/**
 * Capitalize first letter of each word for display.
 * Uses split/join instead of \b\w regex to handle accented chars
 * (é, á, ñ, etc.) which break JS word-boundary matching.
 */
export function capitalize(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export interface ProfessionGroup {
  /** Display name — the most frequent raw variant, capitalized */
  display: string
  /** Total count across all gender variants */
  count: number
}

/**
 * Merge raw profession rows into normalized groups.
 * Returns the top `limit` professions sorted by count desc.
 */
export function mergeProfessions(
  rows: { profession: string; count: number }[],
  limit = 10,
): ProfessionGroup[] {
  const groups = new Map<
    string,
    { display: string; count: number; maxVariantCount: number }
  >()

  for (const row of rows) {
    const key = normalizeProfession(row.profession)
    const existing = groups.get(key)
    if (existing) {
      existing.count += row.count
      // Keep the variant with the highest count as display name
      if (row.count > existing.maxVariantCount) {
        existing.display = row.profession
        existing.maxVariantCount = row.count
      }
    } else {
      groups.set(key, {
        display: row.profession,
        count: row.count,
        maxVariantCount: row.count,
      })
    }
  }

  return Array.from(groups.values())
    .map((g) => ({ display: capitalize(g.display), count: g.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Build a de-duplicated, alphabetically sorted list of normalized profession
 * names for use in filter dropdowns. Returns { normalized, display } pairs.
 */
export function buildProfessionOptions(
  rawProfessions: string[],
): { value: string; label: string }[] {
  const map = new Map<string, { label: string; count: number }>()

  for (const raw of rawProfessions) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normalizeProfession(trimmed)
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { label: capitalize(trimmed), count: 1 })
    }
  }

  return Array.from(map.entries())
    .map(([key, { label }]) => ({ value: key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}
