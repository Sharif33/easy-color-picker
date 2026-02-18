type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, unknown>

export const cn = (...inputs: ClassValue[]): string => {
  return inputs.flatMap(toClasses).join(" ").trim()
}

function toClasses(value: ClassValue): string[] {
  if (value == null || value === false || value === true) return []
  if (typeof value === "number") return [String(value)]
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean)
  if (Array.isArray(value)) return value.flatMap(toClasses)
  return Object.entries(value)
    .filter(([, v]) => !!v)
    .map(([k]) => k)
}
