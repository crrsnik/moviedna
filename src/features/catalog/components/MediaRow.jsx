import MediaCard from './MediaCard.jsx'

function MediaRow({ items, labelledBy }) {
  return (
    <div role="region" aria-labelledby={labelledBy} tabIndex={0} className="min-w-0 overflow-x-auto rounded-lg pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100">
      <ul className="flex gap-4">
        {items.map((media) => <li key={`${media.mediaType}-${media.id}`} className="shrink-0"><MediaCard media={media} /></li>)}
      </ul>
    </div>
  )
}

export default MediaRow
