import { useTranslation } from '../../localization/hooks/useTranslation.js'

export default function PersonExternalLinks({
  homepage,
  links,
}) {
  const { t } = useTranslation()

  const items = [
    ...(homepage
      ? [{
        label:
          t('catalog.detail.officialWebsite'),
        url: homepage,
      }]
      : []),
    ...links,
  ]

  if (!items.length) return null

  return (
    <ul
      aria-label={t(
        'catalog.detail.externalLinks',
      )}
      className="flex flex-wrap gap-4"
    >
      {items.map(({ label, url }) => (
        <li key={label}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  )
}
