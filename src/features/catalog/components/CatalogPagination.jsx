import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { getPagination } from '../validation/searchValidation.js'

export default function CatalogPagination({
  page,
  data,
  loading,
  onChange,
}) {
  const { t } = useTranslation()

  const pagination = getPagination(
    data?.page ?? page,
    data?.totalPages ?? 0,
  )

  function go(target) {
    if (
      data
      && !loading
      && target !== null
    ) {
      onChange(target)
    }
  }

  const button = 'rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40'

  return (
    <nav
      aria-label={t('catalog.pagination.navigation')}
      className="flex flex-wrap items-center justify-center gap-4"
    >
      <button
        type="button"
        aria-disabled={
          !data
          || loading
          || !pagination.previous
        }
        onClick={() => go(pagination.previous)}
        className={button}
      >
        {t('catalog.pagination.previous')}
      </button>

      <span
        role="status"
        className="text-sm text-zinc-400"
      >
        {loading
          ? t('catalog.pagination.loading')
          : data
            ? t(
              'catalog.pagination.page',
              {
                page: data.totalPages
                  ? pagination.page
                  : 0,
                total: data.totalPages,
              },
            )
            : t('catalog.pagination.unavailable')}
      </span>

      <button
        type="button"
        aria-disabled={
          !data
          || loading
          || !pagination.next
        }
        onClick={() => go(pagination.next)}
        className={button}
      >
        {t('catalog.pagination.next')}
      </button>
    </nav>
  )
}
