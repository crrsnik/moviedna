import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
      />
      <circle cx="12" cy="12" r="4" />
      <circle
        cx="17.4"
        cy="6.7"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.4V13h2.8v8h3.4Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4.5"
      fill="currentColor"
    >
      <path d="M5.2 4h3.9l3.6 4.8L16.8 4h2l-5.2 6.1L19.3 20h-3.9l-4.1-5.5L6.6 20h-2l5.8-6.8L5.2 4Zm2.7 1.5 8.3 13h1.5l-8.3-13H7.9Z" />
    </svg>
  )
}

function ImdbIcon() {
  return (
    <span
      aria-hidden="true"
      className="
        text-[10px] font-black
        leading-none tracking-[-0.04em]
      "
    >
      IMDb
    </span>
  )
}

function LinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </svg>
  )
}

function platformFor({ label, url }) {
  const text = (
    `${label ?? ''} ${url ?? ''}`
  ).toLowerCase()

  if (text.includes('instagram')) {
    return 'instagram'
  }

  if (
    text.includes('twitter')
    || text.includes('x.com')
  ) {
    return 'x'
  }

  if (text.includes('facebook')) {
    return 'facebook'
  }

  if (text.includes('imdb')) {
    return 'imdb'
  }

  if (
    text.includes('official')
    || text.includes('homepage')
  ) {
    return 'homepage'
  }

  return 'link'
}

function PlatformIcon({ platform }) {
  if (platform === 'instagram') {
    return <InstagramIcon />
  }

  if (platform === 'facebook') {
    return <FacebookIcon />
  }

  if (platform === 'x') {
    return <XIcon />
  }

  if (platform === 'imdb') {
    return <ImdbIcon />
  }

  if (platform === 'homepage') {
    return <GlobeIcon />
  }

  return <LinkIcon />
}

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
      className="flex flex-wrap gap-2"
    >
      {items.map(({ label, url }) => {
        const platform = platformFor({
          label,
          url,
        })

        return (
          <li key={`${label}:${url}`}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="
                flex size-10 items-center justify-center
                rounded-full border border-border-strong
                bg-surface text-primary
                transition-colors
                hover:bg-surface-muted
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-focus
              "
            >
              <PlatformIcon
                platform={platform}
              />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
