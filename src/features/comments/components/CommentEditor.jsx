import { useId, useState } from 'react'

import LibraryDialog, {
  libraryButton,
} from '../../library/components/LibraryDialog.jsx'
import { useTranslation } from '../../localization/hooks/useTranslation.js'
import { useCommentAction } from '../hooks/useCommentAction.js'
import { useComments } from '../hooks/useComments.js'
import { commentService } from '../services/commentService.js'
import {
  validateCommentInput,
} from '../validation/commentValidation.js'

export default function CommentEditor({
  uid,
  profile,
  media,
}) {
  const { t } = useTranslation()
  const own = useComments(media, uid, true)
  const action = useCommentAction()
  const id = useId()

  const [draft, setDraft] = useState(null)
  const [validation, setValidation] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const input = draft ?? {
    text: '',
    containsSpoiler: false,
  }

  const editing = draft !== null || !own.data

  function save(event) {
    event.preventDefault()

    try {
      validateCommentInput(input)
      setValidation(null)
    } catch {
      setValidation(true)
      return
    }

    action.run(
      'save',
      () => commentService.saveComment(
        uid,
        profile,
        media,
        input,
      ),
      () => setDraft(null),
    )
  }

  if (own.loading) {
    return (
      <p role="status">
        {t('comments.ownLoading')}
      </p>
    )
  }

  if (own.error) {
    return (
      <p role="alert">
        {t('comments.ownError')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {editing ? (
        <form
          onSubmit={save}
          className="space-y-3"
          aria-busy={action.pending}
        >
          <label
            htmlFor={id}
            className="block font-medium"
          >
            {own.data
              ? t('comments.editLabel')
              : t('comments.newLabel')}
          </label>

          <textarea
            id={id}
            value={input.text}
            disabled={action.pending}
            onChange={(event) => {
              setDraft({
                ...input,
                text: event.target.value,
              })
              setValidation(null)
            }}
            rows={4}
            aria-describedby={
              `${id}-count${
                validation
                  ? ` ${id}-error`
                  : ''
              }`
            }
            aria-invalid={Boolean(validation)}
            className="w-full min-w-0 rounded-lg border border-border-strong bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          />

          <p
            id={`${id}-count`}
            className="text-sm text-secondary"
          >
            {t(
              'comments.characterCount',
              {
                count:
                  input.text.trim().length,
              },
            )}
          </p>

          {validation && (
            <p
              id={`${id}-error`}
              role="alert"
            >
              {t(
                'comments.validationError',
              )}
            </p>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="containsSpoiler"
              checked={input.containsSpoiler}
              disabled={action.pending}
              onChange={(event) => setDraft({
                ...input,
                containsSpoiler:
                  event.target.checked,
              })}
              className="focus-visible:outline-2 focus-visible:outline-offset-4"
            />

            {t('comments.spoilerLabel')}
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className={libraryButton}
              disabled={action.pending}
              type="submit"
            >
              {action.pending
                ? t('comments.saving')
                : t('comments.save')}
            </button>

            {draft !== null && (
              <button
                type="button"
                className={libraryButton}
                disabled={action.pending}
                onClick={() => {
                  setDraft(null)
                  setValidation(null)
                }}
              >
                {t('comments.cancel')}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p>
            {t('comments.published')}
          </p>

          <button
            type="button"
            className={libraryButton}
            disabled={action.pending}
            onClick={() => setDraft({
              text: own.data.text,
              containsSpoiler:
                own.data.containsSpoiler,
            })}
          >
            {t('comments.edit')}
          </button>

          <button
            type="button"
            className={libraryButton}
            disabled={action.pending}
            onClick={() => setDeleting(true)}
          >
            {t('comments.delete')}
          </button>
        </div>
      )}

      {action.error && !deleting && (
        <p role="alert">
          {t('comments.actionError')}
        </p>
      )}

      {action.pending && (
        <p role="status">
          {action.operation === 'delete'
            ? t('comments.deleting')
            : t('comments.saving')}
        </p>
      )}

      {deleting && (
        <LibraryDialog
          title={t('comments.deleteTitle')}
          pending={action.pending}
          onClose={() => setDeleting(false)}
        >
          <p>
            {t('comments.deleteDescription')}
          </p>

          {action.error && (
            <p role="alert">
              {t('comments.actionError')}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={libraryButton}
              disabled={action.pending}
              onClick={() => setDeleting(false)}
              autoFocus
            >
              {t('comments.cancel')}
            </button>

            <button
              type="button"
              className={libraryButton}
              disabled={action.pending}
              onClick={() => action.run(
                'delete',
                () => commentService.deleteComment(
                  uid,
                  media,
                ),
                () => {
                  setDeleting(false)
                  setDraft(null)
                },
              )}
            >
              {action.pending
                ? t('comments.deleting')
                : t('comments.confirmDelete')}
            </button>
          </div>
        </LibraryDialog>
      )}
    </div>
  )
}
