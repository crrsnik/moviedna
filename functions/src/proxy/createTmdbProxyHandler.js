import { isExpectedTmdbPayload, validateTmdbProxyRequest } from './tmdbProxyContract.js'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024

function send(res, status, code, data) {
  res.set?.('Cache-Control', 'private, no-store, max-age=0')
  res.set?.('Content-Type', 'application/json; charset=utf-8')
  res.set?.('Pragma', 'no-cache')
  res.set?.('X-Content-Type-Options', 'nosniff')
  res.status(status).json(data === undefined ? { error: code } : data)
}

function getAppCheckHeader(req) {
  const value = req.headers?.['x-firebase-appcheck']
  return typeof value === 'string' && value.trim() && value.length <= 4096 ? value.trim() : null
}

async function readJsonWithinLimit(response, maxResponseBytes) {
  const contentLength = response.headers.get('content-length')
  if (contentLength !== null
    && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxResponseBytes)) return null

  if (!response.body?.getReader) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maxResponseBytes) return null
    return JSON.parse(text)
  }

  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxResponseBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

export function createTmdbProxyHandler({
  verifyAppCheck,
  getSecret,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8_000,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
}) {
  return async function tmdbProxyHandler(req, res) {
    if (req.method !== 'GET') return send(res, 405, 'method-not-allowed')
    const appCheckToken = getAppCheckHeader(req)
    if (!appCheckToken) return send(res, 401, 'app-check-required')

    let decodedToken
    try {
      decodedToken = await verifyAppCheck(appCheckToken)
    } catch {
      return send(res, 403, 'app-check-invalid')
    }
    if (typeof decodedToken?.app_id !== 'string' || !decodedToken.app_id) {
      return send(res, 403, 'app-check-invalid')
    }

    const contract = validateTmdbProxyRequest(req.originalUrl ?? req.url, req.method)
    if (!contract) return send(res, 400, 'unsupported-request')

    let secret
    try {
      secret = getSecret()
    } catch {
      return send(res, 503, 'catalog-unavailable')
    }
    if (typeof secret !== 'string' || !secret.trim()) return send(res, 503, 'catalog-unavailable')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const upstreamUrl = new URL(`${TMDB_BASE_URL}${contract.path}`)
      upstreamUrl.search = contract.query.toString()
      const upstream = await fetchImpl(upstreamUrl, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${secret.trim()}` },
        redirect: 'error',
        signal: controller.signal,
      })
      if (!upstream.ok) {
        if (upstream.status === 404) return send(res, 404, 'not-found')
        if (upstream.status === 429) return send(res, 429, 'rate-limited')
        if (upstream.status === 400) return send(res, 400, 'unsupported-request')
        return send(res, 502, 'catalog-unavailable')
      }
      if (!upstream.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        return send(res, 502, 'invalid-catalog-response')
      }
      let payload
      try {
        payload = await readJsonWithinLimit(upstream, maxResponseBytes)
      } catch {
        return send(res, 502, 'invalid-catalog-response')
      }
      if (!isExpectedTmdbPayload(payload, contract.responseKind)) {
        return send(res, 502, 'invalid-catalog-response')
      }
      return send(res, 200, null, payload)
    } catch (error) {
      return send(res, error?.name === 'AbortError' ? 504 : 502,
        error?.name === 'AbortError' ? 'catalog-timeout' : 'catalog-unavailable')
    } finally {
      clearTimeout(timeout)
    }
  }
}
