import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  Navigate,
  useSearchParams,
} from 'react-router-dom'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

import CustomListForm from '../features/library/components/CustomListForm.jsx'
import DeleteListDialog from '../features/library/components/DeleteListDialog.jsx'
import LibraryBoardsHome from '../features/library/components/LibraryBoardsHome.jsx'
import LibraryItems from '../features/library/components/LibraryItems.jsx'

import {
  libraryButton,
} from '../features/library/components/LibraryDialog.jsx'

import { useCustomLists } from '../features/library/hooks/useCustomLists.js'

import {
  librarySelectionParams,
  normalizeLibrarySelection,
} from '../features/library/validation/customListValidation.js'

function Library({ uid }) {
  const { t } = useTranslation()

  const [
    params,
    setParams,
  ] = useSearchParams()

  const lists = useCustomLists(uid)

  const selection = normalizeLibrarySelection(
    params,
  )

  const canonical = librarySelectionParams(
    selection,
  ).toString()

  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    if (params.toString() !== canonical) {
      setParams(
        canonical,
        { replace: true },
      )
    }
  }, [
    params,
    canonical,
    setParams,
  ])

  if (selection.view === 'ratings') {
    return (
      <Navigate
        to="/profile/ratings"
        replace
      />
    )
  }

  const selected = lists.data?.find(
    list => list.id === selection.listId,
  )

  const close = () => setDialog(null)

  const boardsHref = `?${librarySelectionParams({
    view: 'boards',
  })}`

  return (
    <section className="w-full min-w-0 self-start space-y-6">
      <h1 className="text-3xl font-semibold">
        My Library
      </h1>

      {selection.view === 'boards' ? (
        <LibraryBoardsHome
          uid={uid}
          lists={lists}
          onCreate={() => setDialog({
            type: 'create',
          })}
        />
      ) : (
        <>
          <Link
            to={boardsHref}
            className="inline-flex text-sm font-medium text-zinc-400 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            ← {t('library.boards.backToBoards')}
          </Link>

          {selection.view === 'list' ? (
            selected ? (
              <>
                <div className="space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words text-2xl font-semibold">
                        {selected.name}
                      </h2>

                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                        {selected.visibility === 'public'
                          ? t(
                              'library.lists.publicBoard',
                            )
                          : t(
                              'library.boards.privateBoard',
                            )}
                      </span>
                    </div>

                    {selected.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-zinc-300">
                        {selected.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={libraryButton}
                      onClick={() => setDialog({
                        type: 'edit',
                        list: selected,
                      })}
                    >
                      {t('library.boards.edit')}
                    </button>

                    <button
                      type="button"
                      className={libraryButton}
                      onClick={() => setDialog({
                        type: 'delete',
                        list: selected,
                      })}
                    >
                      {t('library.boards.delete')}
                    </button>
                  </div>
                </div>

                <LibraryItems
                  key={selection.listId}
                  uid={uid}
                  {...selection}
                />
              </>
            ) : (
              !lists.loading
              && !lists.error && (
                <div>
                  <h2 className="text-xl">
                    {t('library.boards.notFound')}
                  </h2>

                  <Link
                    to={boardsHref}
                    className="underline focus-visible:outline-2"
                  >
                    {t(
                      'library.boards.backToBoards',
                    )}
                  </Link>
                </div>
              )
            )
          ) : (
            <>
              <h2 className="text-2xl font-semibold">
                {selection.view === 'favorites'
                  ? t('library.views.favorites')
                  : t('library.views.watchlist')}
              </h2>

              <LibraryItems
                key={selection.view}
                uid={uid}
                {...selection}
              />
            </>
          )}
        </>
      )}

      {dialog?.type === 'delete' ? (
        <DeleteListDialog
          uid={uid}
          list={dialog.list}
          onClose={close}
          onDeleted={() => {
            close()
            setParams({
              view: 'boards',
            })
          }}
        />
      ) : dialog ? (
        <CustomListForm
          uid={uid}
          list={dialog.list}
          onClose={close}
          onSaved={id => {
            close()

            if (dialog.type === 'create') {
              setParams(
                librarySelectionParams({
                  view: 'list',
                  listId: id,
                }),
              )
            }
          }}
        />
      ) : null}
    </section>
  )
}

export default function LibraryPage() {
  const { user } = useAuth()

  return (
    <Library
      key={user.uid}
      uid={user.uid}
    />
  )
}
