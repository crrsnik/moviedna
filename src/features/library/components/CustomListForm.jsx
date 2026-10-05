import {
  useId,
  useState,
} from 'react'

import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { normalizeListInput } from '../validation/customListValidation.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'
import { useLibraryAction } from '../hooks/useLibraryAction.js'

import LibraryDialog, {
  libraryButton,
} from './LibraryDialog.jsx'

export default function CustomListForm({
  uid,
  list,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation()

  const [name, setName] = useState(
    list?.name ?? '',
  )

  const [description, setDescription] =
    useState(
      list?.description ?? '',
    )

  const [visibility, setVisibility] =
    useState(
      list?.visibility ?? 'private',
    )

  const action = useLibraryAction()
  const id = useId()

  let valid = true

  try {
    normalizeListInput({
      name,
      description,
      visibility,
    })
  } catch {
    valid = false
  }

  const submit = event => {
    event.preventDefault()

    if (!valid) return

    action.run(
      () => (
        list
          ? mediaLibraryService
            .updateCustomList(
              uid,
              list.id,
              {
                name,
                description,
                visibility,
              },
            )
          : mediaLibraryService
            .createCustomList(
              uid,
              {
                name,
                description,
                visibility,
              },
            )
      ),
      result => (
        onSaved(
          result ?? list?.id,
        )
      ),
    )
  }

  return (
    <LibraryDialog
      title={
        list
          ? t('library.form.editTitle')
          : t('library.form.createTitle')
      }
      pending={action.pending}
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor={`${id}-name`}
            className="block"
          >
            {t('library.form.name')}
          </label>

          <input
            id={`${id}-name`}
            autoFocus
            required
            maxLength={60}
            value={name}
            disabled={action.pending}
            onChange={event => (
              setName(
                event.target.value,
              )
            )}
            aria-describedby={
              `${id}-name-help`
            }
            className="mt-1 w-full rounded border border-border-strong bg-surface-muted p-2 focus-visible:outline-2"
          />

          <p
            id={`${id}-name-help`}
            className="text-sm text-secondary"
          >
            {t(
              'library.form.nameHelp',
              {
                count: name.length,
              },
            )}
          </p>
        </div>

        <div>
          <label
            htmlFor={`${id}-description`}
            className="block"
          >
            {t(
              'library.form.description',
            )}
          </label>

          <textarea
            id={`${id}-description`}
            maxLength={300}
            value={description}
            disabled={action.pending}
            onChange={event => (
              setDescription(
                event.target.value,
              )
            )}
            aria-describedby={
              `${id}-description-help`
            }
            className="mt-1 w-full rounded border border-border-strong bg-surface-muted p-2 focus-visible:outline-2"
          />

          <p
            id={`${id}-description-help`}
            className="text-sm text-secondary"
          >
            {t(
              'library.form.descriptionHelp',
              {
                count:
                  description.length,
              },
            )}
          </p>
        </div>

        <fieldset
          disabled={action.pending}
          className="space-y-3"
        >
          <legend className="font-medium">
            {t(
              'library.form.visibility',
            )}
          </legend>

          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="radio"
              name={`${id}-visibility`}
              value="private"
              checked={
                visibility === 'private'
              }
              onChange={() => (
                setVisibility('private')
              )}
              className="mt-1"
            />

            <span>
              <strong className="block">
                {t(
                  'library.form.private',
                )}
              </strong>

              <span className="text-sm text-secondary">
                {t(
                  'library.form.privateDescription',
                )}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="radio"
              name={`${id}-visibility`}
              value="public"
              checked={
                visibility === 'public'
              }
              onChange={() => (
                setVisibility('public')
              )}
              className="mt-1"
            />

            <span>
              <strong className="block">
                {t(
                  'library.form.public',
                )}
              </strong>

              <span className="text-sm text-secondary">
                {t(
                  'library.form.publicDescription',
                )}
              </span>
            </span>
          </label>
        </fieldset>

        {action.error && (
          <p role="alert">
            {t('library.errors.action')}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={libraryButton}
            disabled={action.pending}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>

          <button
            type="submit"
            className={libraryButton}
            disabled={
              !valid
              || action.pending
            }
          >
            {action.pending
              ? list
                ? t(
                  'library.form.saving',
                )
                : t(
                  'library.form.creating',
                )
              : list
                ? t(
                  'library.form.saveChanges',
                )
                : t(
                  'library.form.create',
                )}
          </button>
        </div>
      </form>
    </LibraryDialog>
  )
}
