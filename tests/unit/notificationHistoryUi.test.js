import { readFile } from 'node:fs/promises'

import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

describe(
  'notification history UI contract',
  () => {
    it(
      'exposes the protected notifications route',
      async () => {
        const router = await readFile(
          new URL(
            '../../src/app/router.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          router,
          /path: 'notifications'/,
        )

        assert.match(
          router,
          /<NotificationsPage \/>/,
        )
      },
    )

    it(
      'loads paginated notification history',
      async () => {
        const hook = await readFile(
          new URL(
            '../../src/features/notifications/hooks/useNotificationHistory.js',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          hook,
          /loadNotificationsPage/,
        )

        assert.match(
          hook,
          /PAGE_SIZE = 25/,
        )

        assert.match(
          hook,
          /loadMore/,
        )
      },
    )

    it(
      'renders achievement definitions from the catalog',
      async () => {
        const page = await readFile(
          new URL(
            '../../src/pages/NotificationsPage.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          page,
          /ACHIEVEMENT_CATALOG_BY_ID/,
        )

        assert.match(
          page,
          /definition\.image/,
        )

        assert.match(
          page,
          /definition\.titleKey/,
        )
      },
    )

    it(
      'supports read and unread actions',
      async () => {
        const page = await readFile(
          new URL(
            '../../src/pages/NotificationsPage.jsx',
            import.meta.url,
          ),
          'utf8',
        )

        assert.match(
          page,
          /markAsRead/,
        )

        assert.match(
          page,
          /markAsUnread/,
        )

        assert.match(
          page,
          /markAllAsRead/,
        )
      },
    )

    it(
      'links the bell dropdown to full history',
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
          /navigate\('\/notifications'\)/,
        )

        assert.match(
          bell,
          /notifications\.viewAll/,
        )
      },
    )
  },
)
