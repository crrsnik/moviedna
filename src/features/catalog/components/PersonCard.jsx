import PersonLink from './PersonLink.jsx'
import { useState } from 'react'
import { getTmdbProfileUrl } from '../services/tmdbImages.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

export default function PersonCard({ person }) {
  const { t } = useTranslation()
  const url = getTmdbProfileUrl(person.profilePath)
  const [failed, setFailed] = useState(null)
  return (
    <article className="min-w-0 space-y-3">
      <PersonLink person={person} className="group block space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
      <div className="flex aspect-2/3 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted shadow-[var(--app-shadow-sm)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-border-strong group-hover:shadow-[var(--app-shadow-md)] motion-reduce:transition-none">
        {url && failed !== url ? <img src={url} alt={person.name} width="185" height="278" loading="lazy" onError={() => setFailed(url)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none" /> : <span className="px-3 text-center text-sm text-tertiary">{t('catalog.media.noPhoto')}</span>}
      </div>
      <span className="text-xs text-secondary">{t('catalog.media.person')}</span>
      <h3 className="break-words text-sm font-medium text-primary transition-colors group-hover:text-accent">{person.name}</h3>
      {person.knownForDepartment && <p className="break-words text-xs text-secondary">{person.knownForDepartment}</p>}
      {!!person.knownFor.length && <p className="break-words text-xs text-secondary">{t('catalog.media.knownFor', { titles: person.knownFor.map((work) => work.title).join(', ') })}</p>}
      </PersonLink>
    </article>
  )
}
