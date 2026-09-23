import { Link } from 'react-router-dom'
import { isValidPersonId } from '../validation/detailRouteValidation.js'
export default function PersonLink({ person, children, className = '' }) {
  return isValidPersonId(person.id)
    ? <Link to={`/actors/${person.id}`} className={`rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}>{children ?? person.name}</Link>
    : <span className={className}>{children ?? person.name}</span>
}
export function PersonNames({ people }) {
  return people.map((person, index) => <span key={`${person.id}:${index}`}>{index > 0 && ', '}<PersonLink person={person} /></span>)
}
