export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Number.isFinite(value) ? value : 0)
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
