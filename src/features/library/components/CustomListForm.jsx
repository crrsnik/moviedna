import {
  useId,
  useState,
} from 'react'

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
  const [name, setName] = useState(
    list?.name ?? '',
  )

  const [description, setDescription] = useState(
    list?.description ?? '',
  )

  const [visibility, setVisibility] = useState(
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
      () => list
        ? mediaLibraryService.updateCustomList(
          uid,
          list.id,
          {
            name,
            description,
            visibility,
          },
        )
        : mediaLibraryService.createCustomList(
          uid,
          {
            name,
            description,
            visibility,
          },
        ),
      result => onSaved(
        result ?? list?.id,
      ),
    )
  }

  return (
    <LibraryDialog
      title={list ? 'Edit list' : 'Create list'}
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
            Name
          </label>

          <input
            id={`${id}-name`}
            autoFocus
            required
            maxLength={60}
            value={name}
            disabled={action.pending}
            onChange={event => (
              setName(event.target.value)
            )}
            aria-describedby={`${id}-name-help`}
            className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2 focus-visible:outline-2"
          />

          <p
            id={`${id}-name-help`}
            className="text-sm text-zinc-400"
          >
            {name.length}/60 · A name is required.
          </p>
        </div>

        <div>
          <label
            htmlFor={`${id}-description`}
            className="block"
          >
            Description
          </label>

          <textarea
            id={`${id}-description`}
            maxLength={300}
            value={description}
            disabled={action.pending}
            onChange={event => (
              setDescription(event.target.value)
            )}
            aria-describedby={`${id}-description-help`}
            className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2 focus-visible:outline-2"
          />

          <p
            id={`${id}-description-help`}
            className="text-sm text-zinc-400"
          >
            {description.length}/300
          </p>
        </div>

        <fieldset
          disabled={action.pending}
          className="space-y-3"
        >
          <legend className="font-medium">
            Visibility
          </legend>

          <label className="flex items-start gap-3 rounded-lg border border-zinc-700 p-3">
            <input
              type="radio"
              name={`${id}-visibility`}
              value="private"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
              className="mt-1"
            />

            <span>
              <strong className="block">
                Private
              </strong>

              <span className="text-sm text-zinc-400">
                Only you can access this list.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-zinc-700 p-3">
            <input
              type="radio"
              name={`${id}-visibility`}
              value="public"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
              className="mt-1"
            />

            <span>
              <strong className="block">
                Public
              </strong>

              <span className="text-sm text-zinc-400">
                Shown on your profile to people who can view your profile content.
              </span>
            </span>
          </label>
        </fieldset>

        {action.error && (
          <p role="alert">
            {action.error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={libraryButton}
            disabled={action.pending}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={libraryButton}
            disabled={!valid || action.pending}
          >
            {action.pending
              ? list
                ? 'Saving…'
                : 'Creating…'
              : list
                ? 'Save changes'
                : 'Create'}
          </button>
        </div>
      </form>
    </LibraryDialog>
  )
}
