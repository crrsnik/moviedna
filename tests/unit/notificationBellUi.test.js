import { readFile } from 'node:fs/promises'

import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

describe(
  'notification bell UI contract',
  () => {
    it(
      'renders the bell only for authenticated users',
      async () => {
        const header = await readFile(
          new URL(
            '../../src/shared/components/layout/Header.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          header,
          /isAuthenticated && \(/,
        )

        assert.match(
          header,
          /<NotificationBell \/>/,
        )
      },
    )

    it(
      'uses realtime notifications and unread badge',
      async () => {
        const bell = await readFile(
          new URL(
            '../../src/features/notifications/components/NotificationBell.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          bell,
          /useNotifications\(\)/,
        )

        assert.match(
          bell,
          /unreadCount > 0/,
        )

        assert.match(
          bell,
          /notifications\.slice\(0, PREVIEW_LIMIT\)/,
        )
      },
    )

    it(
      'supports read actions and notification navigation',
      async () => {
        const bell = await readFile(
          new URL(
            '../../src/features/notifications/components/NotificationBell.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          bell,
          /markAsRead\(notification\.id\)/,
        )

        assert.match(
          bell,
          /markAllAsRead\(\)/,
        )

        assert.match(
          bell,
          /notificationTarget\(notification\)/,
        )
      },
    )

    it(
      'loads current actor profile identity',
      async () => {
        const bell = await readFile(
          new URL(
            '../../src/features/notifications/components/NotificationBell.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          bell,
          /getPublicProfileByUserId/,
        )

        assert.match(
          bell,
          /PROFILE_AVATARS/,
        )
      },
    )
  },
)
