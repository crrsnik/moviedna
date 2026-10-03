import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { useTranslation } from '../../localization/hooks/useTranslation.js'

import UserSearchForm from './UserSearchForm.jsx'
import UserSearchResult from './UserSearchResult.jsx'
import { useUserSearch } from '../hooks/useUserSearch.js'

import {
  createUserSearchParams,
  getUserSearchError,
  normalizeUserSearchQuery,
} from '../validation/userSearchValidation.js'

const button = (
  'rounded-lg border border-zinc-700 px-4 py-2 text-sm '
  + 'hover:bg-zinc-800 focus-visible:outline-2 '
  + 'focus-visible:outline-offset-4 focus-visible:outline-zinc-100'
)

export default function UserSearchPanel() {
  const { t } = useTranslation()
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
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
      aria-labelledby="friend-search-title"
    >
      <div className="space-y-2">
        <h2
          id="friend-search-title"
          className="text-xl font-semibold"
        >
          {t('social.userSearch.title')}
        </h2>

        <p className="max-w-2xl text-sm text-zinc-400">
          {t('social.userSearch.description')}
        </p>
      </div>

      <div className="mt-5">
        <UserSearchForm
          query={query}
          onSearch={search}
        />
      </div>

      <div className="mt-5">
        {validation ? (
          <p className="text-zinc-400">
            {t(
              query
                ? 'social.userSearch.validationFormat'
                : 'social.userSearch.validationEmpty',
            )}
          </p>
        ) : loading ? (
          <p
            role="status"
            aria-live="polite"
            className="text-zinc-400"
          >
            {t('social.userSearch.searching')}
          </p>
        ) : error ? (
          <div className="space-y-4">
            <p role="alert">
              {t('social.userSearch.searchError')}
            </p>

            <button
              type="button"
              className={button}
              onClick={retry}
            >
              {t('social.userSearch.retry')}
            </button>
          </div>
        ) : result?.kind === 'not-found' ? (
          <p className="break-words text-zinc-400">
            {t(
              'social.userSearch.notFound',
              { username: query },
            )}
          </p>
        ) : result?.profile ? (
          <div className="max-w-2xl">
            <UserSearchResult
              profile={result.profile}
              currentUserId={user?.uid}
            />
          </div>
        ) : hasQuery ? null : (
          <p className="text-sm text-zinc-500">
            {t('social.userSearch.emptyPrompt')}
          </p>
        )}
      </div>
    </section>
  )
}
