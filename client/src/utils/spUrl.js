export function validateSpUrl(url) {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('https://') && url.includes('.sharepoint.com')
}
