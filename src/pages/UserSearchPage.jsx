import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import UserSearchForm from '../features/profile/components/UserSearchForm.jsx'
import UserSearchResult from '../features/profile/components/UserSearchResult.jsx'
import { useUserSearch } from '../features/profile/hooks/useUserSearch.js'

import {
  createUserSearchParams,
  getUserSearchError,
  normalizeUserSearchQuery,
} from '../features/profile/validation/userSearchValidation.js'

const button = 'rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100'

export default function UserSearchPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const hasQuery = params.has('q')

  const query = normalizeUserSearchQuery(
    params.get('q') ?? '',
  )

  const validation = hasQuery
    ? getUserSearchError(query)
    : null

  const {
    result,
    loading,
    error,
    retry,
  } = useUserSearch(validation ? '' : query)

  function search(username) {
    setParams(createUserSearchParams(username))
  }

  return (
    <section
      className="w-full min-w-0 space-y-8"
      aria-labelledby="user-search-title"
    >
      <div className="space-y-2">
        <h1
          id="user-search-title"
          className="text-3xl font-semibold tracking-tight"
        >
          Find users
        </h1>

        <p className="max-w-2xl text-sm text-zinc-400">
          Find another MovieDNA member by their exact username.
        </p>
      </div>

      <UserSearchForm
        query={query}
        onSearch={search}
      />

      {validation ? (
        <p className="text-zinc-400">
          {validation}
        </p>
      ) : loading ? (
        <p
          role="status"
          aria-live="polite"
          className="text-zinc-400"
        >
          Searching…
        </p>
      ) : error ? (
        <div className="space-y-4">
          <p role="alert">
            We couldn't search for this user right now.
          </p>

          <button
            type="button"
            className={button}
            onClick={retry}
          >
            Retry
          </button>
        </div>
      ) : result?.kind === 'not-found' ? (
        <p className="break-words text-zinc-400">
          No MovieDNA user found with username @{query}.
        </p>
      ) : result?.profile ? (
        <div className="max-w-2xl">
          <UserSearchResult
            profile={result.profile}
            currentUserId={user?.uid}
          />
        </div>
      ) : hasQuery ? null : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Enter a username to find a MovieDNA profile.
          </p>
        </div>
      )}
    </section>
  )
}
