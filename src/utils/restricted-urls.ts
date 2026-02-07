export const RESTRICTED_URLS = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "devtools://"
]

export const isRestrictedUrl = (url: string) => {
  return RESTRICTED_URLS.some((prefix) => url.startsWith(prefix))
}
