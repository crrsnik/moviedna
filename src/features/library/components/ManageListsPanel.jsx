import {
  useId,
  useState,
} from 'react'

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

  const [creating, setCreating] =
    useState(false)

  const [newListName, setNewListName] =
    useState('')

  const [createdListId, setCreatedListId] =
    useState(null)

  const nameId = useId()

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

  const hasLists = Boolean(
    lists.data?.length,
  )

  const showCreateForm = (
    creating
    || createdListId
    || (
      !lists.loading
      && !lists.error
      && !hasLists
    )
  )

  const cleanNewListName =
    newListName.trim()

  const validNewListName = (
    cleanNewListName.length > 0
    && cleanNewListName.length <= 60
  )

  const createAndAdd = async () => {
    let listId = createdListId

    if (!listId) {
      listId = await (
        mediaLibraryService
          .createCustomList(
            uid,
            {
              name: cleanNewListName,
              description: '',
              visibility: 'private',
            },
          )
      )

      setCreatedListId(listId)
    }

    const nextSelected = Array.from(
      new Set([
        ...selected,
        listId,
      ]),
    )

    await (
      mediaLibraryService
        .updateMediaListMemberships(
          uid,
          media,
          nextSelected,
        )
    )

    return listId
  }

  const submitCreate = event => {
    event.preventDefault()

    if (
      !validNewListName
      && !createdListId
    ) {
      return
    }

    action.run(
      createAndAdd,
      onClose,
    )
  }

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
          {!hasLists ? (
            <p className="text-secondary">
              {t('library.manage.noLists')}
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

          {hasLists && !showCreateForm && (
            <button
              type="button"
              className={`${libraryButton} mt-5`}
              disabled={action.pending}
              onClick={() => (
                setCreating(true)
              )}
            >
              {t(
                'library.manage.createNew',
              )}
            </button>
          )}

          {showCreateForm && (
            <form
              onSubmit={submitCreate}
              className="mt-5 space-y-3 rounded-xl border border-border bg-surface-muted p-4"
            >
              <div className="space-y-1">
                <label
                  htmlFor={nameId}
                  className="block text-sm font-medium"
                >
                  {t(
                    'library.manage.newListName',
                  )}
                </label>

                <input
                  id={nameId}
                  type="text"
                  autoFocus
                  maxLength={60}
                  value={newListName}
                  disabled={
                    action.pending
                    || Boolean(createdListId)
                  }
                  onChange={event => (
                    setNewListName(
                      event.target.value,
                    )
                  )}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />

                <p className="text-xs text-secondary">
                  {newListName.length}/60
                </p>
              </div>

              <p className="text-sm text-secondary">
                {t(
                  'library.manage.quickCreateHint',
                )}
              </p>

              <div className="flex flex-wrap gap-2">
                {hasLists && !createdListId && (
                  <button
                    type="button"
                    className={libraryButton}
                    disabled={action.pending}
                    onClick={() => {
                      setCreating(false)
                      setNewListName('')
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                )}

                <button
                  type="submit"
                  className={libraryButton}
                  disabled={
                    action.pending
                    || (
                      !validNewListName
                      && !createdListId
                    )
                  }
                >
                  {action.pending
                    ? t(
                      'library.manage.creatingAndAdding',
                    )
                    : t(
                      'library.manage.createAndAdd',
                    )}
                </button>
              </div>
            </form>
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

        {hasLists && (
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
        )}
      </div>
    </LibraryDialog>
  )
}
