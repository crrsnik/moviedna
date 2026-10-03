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
      <PersonLink person={person} className="block space-y-3">
      <div className="flex aspect-2/3 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {url && failed !== url ? <img src={url} alt={person.name} width="185" height="278" loading="lazy" onError={() => setFailed(url)} className="h-full w-full object-cover" /> : <span className="px-3 text-center text-sm text-zinc-500">{t('catalog.media.noPhoto')}</span>}
      </div>
      <span className="text-xs text-zinc-400">{t('catalog.media.person')}</span>
      <h3 className="break-words text-sm font-medium">{person.name}</h3>
      {person.knownForDepartment && <p className="break-words text-xs text-zinc-400">{person.knownForDepartment}</p>}
      {!!person.knownFor.length && <p className="break-words text-xs text-zinc-400">{t('catalog.media.knownFor', { titles: person.knownFor.map((work) => work.title).join(', ') })}</p>}
      </PersonLink>
    </article>
  )
}
