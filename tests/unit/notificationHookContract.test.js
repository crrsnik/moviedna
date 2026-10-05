import {
  readFile,
} from 'node:fs/promises'

import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

describe(
  'notification hook contract',
  () => {
    it(
      'uses auth-scoped realtime notifications',
      async () => {
        const source = await readFile(
          new URL(
            '../../src/features/notifications/hooks/useNotifications.js',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          source,
          /useAuth\(\)/,
        )

        assert.match(
          source,
          /subscribeToNotifications/,
        )

        assert.match(
          source,
          /notification\.readAt === null/,
        )
      },
    )

    it(
      'exposes notification read actions',
      async () => {
        const source = await readFile(
          new URL(
            '../../src/features/notifications/hooks/useNotifications.js',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          source,
          /markAsRead/,
        )

        assert.match(
          source,
          /markAsUnread/,
        )

        assert.match(
          source,
          /markAllAsRead/,
        )
      },
    )
  },
)
