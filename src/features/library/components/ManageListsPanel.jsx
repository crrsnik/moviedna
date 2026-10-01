import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { useCustomLists } from '../hooks/useCustomLists.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'

import LibraryDialog, {
  libraryButton,
} from './LibraryDialog.jsx'

export default function ManageListsPanel({
  uid,
  media,
  listIds,
  onClose,
}) {
  const { t } = useTranslation()

  const lists = useCustomLists(uid)
  const action = useLibraryAction()

  const [selected, setSelected] =
    useState(() => [...listIds])

  const known = new Set(
    lists.data?.map(list => list.id),
  )

  const missing = selected.some(
    id => !known.has(id),
  )

  const toggle = id => (
    setSelected(previous => (
      previous.includes(id)
        ? previous.filter(
          value => value !== id,
        )
        : [...previous, id]
    ))
  )

  return (
    <LibraryDialog
      title={t('library.manage.title')}
      pending={action.pending}
      onClose={onClose}
    >
      {lists.loading ? (
        <p role="status">
          {t('library.manage.loading')}
        </p>
      ) : lists.error ? (
        <p role="alert">
          {t('library.errors.load')}
        </p>
      ) : (
        <>
          {!lists.data.length ? (
            <p>
              {t('library.manage.noLists')}{' '}

              <Link
                to="/library?view=favorites"
                className="underline"
                onClick={onClose}
              >
                {t(
                  'library.manage.createInLibrary',
                )}
              </Link>
              .
            </p>
          ) : (
            <fieldset
              disabled={action.pending}
              className="space-y-3"
            >
              <legend className="mb-3">
                {t(
                  'library.manage.chooseLists',
                  {
                    count:
                      selected.length,
                  },
                )}
              </legend>

              {lists.data.map(list => (
                <label
                  key={list.id}
                  className="flex items-start gap-3 break-all"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(
                      list.id,
                    )}
                    onChange={() => (
                      toggle(list.id)
                    )}
                    className="mt-1 size-4 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4"
                  />

                  {list.name}
                </label>
              ))}
            </fieldset>
          )}

          {selected.length > 20 && (
            <p role="alert">
              {t(
                'library.manage.tooMany',
              )}
            </p>
          )}

          {missing && (
            <p role="alert">
              {t(
                'library.manage.missing',
              )}{' '}

              <button
                type="button"
                className="underline"
                disabled={action.pending}
                onClick={() => (
                  setSelected(
                    previous => (
                      previous.filter(
                        id => known.has(id),
                      )
                    ),
                  )
                )}
              >
                {t(
                  'library.manage.clearMissing',
                )}
              </button>
              .
            </p>
          )}
        </>
      )}

      {action.error && (
        <p
          role="alert"
          className="mt-3"
        >
          {t('library.errors.action')}
        </p>
      )}

      {(lists.error || action.error) && (
        <button
          type="button"
          className={`${libraryButton} mt-3`}
          disabled={action.pending}
          onClick={lists.retry}
        >
          {t('library.manage.refresh')}
        </button>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className={libraryButton}
          disabled={action.pending}
          onClick={onClose}
        >
          {t('common.cancel')}
        </button>

        <button
          type="button"
          className={libraryButton}
          disabled={
            action.pending
            || lists.loading
            || Boolean(lists.error)
            || missing
            || selected.length > 20
          }
          onClick={() => (
            action.run(
              () => (
                mediaLibraryService
                  .updateMediaListMemberships(
                    uid,
                    media,
                    selected,
                  )
              ),
              onClose,
            )
          )}
        >
          {action.pending
            ? t(
              'library.manage.saving',
            )
            : t(
              'library.manage.save',
            )}
        </button>
      </div>
    </LibraryDialog>
  )
}
