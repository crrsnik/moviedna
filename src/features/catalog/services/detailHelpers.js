export const asList = (value) => Array.isArray(value) ? value : []
export const cleanText = (value) => typeof value === 'string' ? value.trim() : ''
export const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0 ? value : null
const list = asList
const positive = positiveInteger
export function safeHomepage(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim()) || [...value.trim()].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return null
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
export function selectTrailer(videos) {
  const eligible = list(videos).filter((video) => video?.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type)
    && typeof video.key === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(video.key))
  const priority = (video) => video.type === 'Trailer' ? video.official === true ? 0 : 1 : 2
  eligible.sort((a, b) => priority(a) - priority(b) || a.key.localeCompare(b.key, 'en'))
  const video = eligible[0]
  return video ? { url: `https://www.youtube.com/watch?v=${video.key}`, type: video.type } : null
}
export function formatRuntime(minutes) {
  if (!positive(minutes)) return null
  const hours = Math.floor(minutes / 60), remainder = minutes % 60
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ')
}
