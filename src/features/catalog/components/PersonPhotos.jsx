import DetailImage from './DetailImage.jsx'
import { getTmdbProfileUrl } from '../services/tmdbImages.js'
export default function PersonPhotos({ name, images }) {
  if (!images.length) return null
  return <section aria-labelledby="person-photos" className="space-y-5">
    <h2 id="person-photos" className="text-2xl font-semibold">Photos</h2>
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">{images.map((path, index) => <li key={path} className="min-w-0"><DetailImage src={getTmdbProfileUrl(path)} alt={`${name} — photo ${index + 1}`} className="aspect-2/3 rounded-lg" /></li>)}</ul>
  </section>
}
