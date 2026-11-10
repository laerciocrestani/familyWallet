export function monthKey(isoDate: string) {
  return isoDate.slice(0, 7)
}

export function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const last = new Date(year, monthNumber, 0).getDate()
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  }
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(year, monthNumber - 1 + delta, 1)
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0")
  return `${date.getFullYear()}-${nextMonth}`
}

export function isFullMonth(from: string, to: string) {
  if (monthKey(from) !== monthKey(to)) return false
  const bounds = monthBounds(monthKey(from))
  return from === bounds.from && to === bounds.to
}

export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function currentMonth(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${now.getFullYear()}-${month}`
}

export function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}

export function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}
