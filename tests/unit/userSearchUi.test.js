import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

const routerPath = new URL(
  '../../src/app/router.jsx',
  import.meta.url,
)

const headerPath = new URL(
  '../../src/shared/components/layout/Header.jsx',
  import.meta.url,
)

describe('user search routing', () => {
  it('keeps user search inside the authenticated route tree', async () => {
    const source = await readFile(routerPath, 'utf8')

    const protectedIndex = source.indexOf(
      'element: <ProtectedRoute />',
    )

    const searchIndex = source.indexOf(
      "path: 'users/search'",
    )

    const publicProfileIndex = source.indexOf(
      "path: 'users/:username'",
    )

    assert.ok(protectedIndex >= 0)
    assert.ok(searchIndex > protectedIndex)
    assert.ok(publicProfileIndex > protectedIndex)
    assert.ok(searchIndex < publicProfileIndex)
  })

  it('shows the Users navigation entry only to authenticated users', async () => {
    const source = await readFile(headerPath, 'utf8')

    assert.match(
      source,
      /\{isAuthenticated && \([\s\S]*?to="\/users\/search"[\s\S]*?t\('nav\.users'\)/,
    )
  })
})
