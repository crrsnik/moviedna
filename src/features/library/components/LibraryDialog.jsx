import { useEffect, useId, useRef, useState } from 'react'
export const libraryButton = 'rounded-lg border border-border-strong px-4 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-50'
export default function LibraryDialog({ title, pending, onClose, children }) {
  const ref = useRef(null), id = useId()
  const [opener] = useState(() => document.activeElement)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => {
      dialog.close()
      // Restore after React re-enables the trigger; do not steal focus on Strict Mode replay.
      queueMicrotask(() => { if (!dialog.open && opener?.isConnected) opener.focus() })
    }
  }, [opener])
  return <dialog ref={ref} aria-labelledby={id} aria-busy={pending} onCancel={event => { event.preventDefault(); if (!pending) onClose() }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 text-primary backdrop:bg-black/70">
    <h2 id={id} className="mb-5 break-words text-xl font-semibold">{title}</h2>{children}
  </dialog>
}
