import { useParams } from 'react-router-dom'
import { usePersonDetails } from '../features/catalog/hooks/usePersonDetails.js'
import { useDetailPageMetadata } from '../features/catalog/hooks/useDetailPageMetadata.js'
import DetailStatus from '../features/catalog/components/DetailStatus.jsx'
import PersonDetailHero from '../features/catalog/components/PersonDetailHero.jsx'
import PersonFilmography from '../features/catalog/components/PersonFilmography.jsx'
import PersonPhotos from '../features/catalog/components/PersonPhotos.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'
export default function PersonDetailPage() {
  const { personId } = useParams()
  const { data, loading, notFound, error, retry } = usePersonDetails(personId)
  useDetailPageMetadata(personId, data?.name, 'Person details — MovieDNA')
  if (!data) return <DetailStatus loading={loading} notFound={notFound} error={error} retry={retry} noun="Person" backTo="/actors" backLabel="Back to Actors" />
  return <div className="w-full min-w-0 self-start space-y-10">
    <PersonDetailHero person={data} />
    {!!data.knownFor.length && <section aria-labelledby="person-known-for" className="min-w-0 space-y-5"><h2 id="person-known-for" className="text-2xl font-semibold">Known For</h2><MediaRow items={data.knownFor} labelledBy="person-known-for" /></section>}
    <PersonFilmography key={`acting:${data.id}`} title="Acting" credits={data.actingCredits} />
    <PersonFilmography key={`crew:${data.id}`} title="Crew" credits={data.crewCredits} />
    <PersonPhotos name={data.name} images={data.images} />
  </div>
}
