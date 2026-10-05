import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { librarySelectionParams } from '../validation/customListValidation.js'

export default function LibraryViewTabs({ view }) {
  const { t } = useTranslation()

  const views = [
    [
      'favorites',
      t('library.views.favorites'),
    ],
    [
      'watchlist',
      t('library.views.watchlist'),
    ],
    [
      'ratings',
      t('library.views.ratings'),
    ],
  ]

  return (
    <nav
      aria-label={t(
        'library.views.navigation',
      )}
      className="flex flex-wrap gap-3"
    >
      {views.map(([value, label]) => (
        <Link
          key={value}
          to={`?${librarySelectionParams({
            view: value,
          })}`}
          aria-current={
            view === value
              ? 'page'
              : undefined
          }
          className={`rounded-lg border px-4 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-4 ${
            view === value
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
