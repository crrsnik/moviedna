import { useTranslation } from '../../localization/hooks/useTranslation.js'

import { useLibraryAction } from '../hooks/useLibraryAction.js'
import { mediaLibraryService } from '../services/mediaLibraryService.js'

import LibraryDialog, {
  libraryButton,
} from './LibraryDialog.jsx'

export default function DeleteListDialog({
  uid,
  list,
  onClose,
  onDeleted,
}) {
  const { t } = useTranslation()
  const action = useLibraryAction()

  return (
    <LibraryDialog
      title={t(
        'library.delete.title',
        { name: list.name },
      )}
      pending={action.pending}
      onClose={onClose}
    >
      <p>
        {t(
          'library.delete.description',
        )}
      </p>

      {action.error && (
        <p
          role="alert"
          className="mt-4"
        >
          {t('library.errors.action')}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          autoFocus
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
          disabled={action.pending}
          onClick={() => (
            action.run(
              () => (
                mediaLibraryService
                  .deleteCustomList(
                    uid,
                    list.id,
                  )
              ),
              onDeleted,
            )
          )}
        >
          {action.pending
            ? t(
              'library.delete.deleting',
            )
            : t(
              'library.delete.button',
            )}
        </button>
      </div>
    </LibraryDialog>
  )
}
