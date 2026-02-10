// Utility function to calculate if text should be light or dark based on background color
export const getContrastTextColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace("#", "")

  // Convert hex to RGB
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return light text for dark backgrounds, dark text for light backgrounds
  return luminance > 0.5 ? "#000" : "#fff"
}
