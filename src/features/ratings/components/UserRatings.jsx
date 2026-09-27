import { useUserRatings } from '../hooks/useUserRatings.js'
import RatedMediaCard from './RatedMediaCard.jsx'
import { libraryButton } from '../../library/components/LibraryDialog.jsx'
export default function UserRatings({ uid }) {
  const { data, loading, error, retry } = useUserRatings(uid)
  return <section className="space-y-5"><h2 className="text-2xl font-semibold">My Ratings</h2>
    {loading ? <p role="status">Loading your ratings…</p> : error ? <div><p role="alert">{error}</p><button type="button" className={libraryButton} onClick={retry}>Retry ratings</button></div> : !data?.length ? <p>No ratings yet. Rate a movie or TV show on its detail page.</p> : <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{data.map(item => <RatedMediaCard key={item.key} uid={uid} item={item} />)}</div>}
  </section>
}
