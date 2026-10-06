import {
  useEffect,
  useRef,
} from 'react'

export function scrollCatalogToStart() {
  if (typeof document === 'undefined') return

  const target = document.querySelector(
    '[data-catalog-scroll-target]',
  )

  target?.scrollIntoView?.({
    block: 'start',
    behavior: 'auto',
  })
}

export function useCatalogPageScroll(page) {
  const previousPage = useRef(null)

  useEffect(() => {
    if (!Number.isSafeInteger(page) || page < 1) {
      return
    }

    const previous = previousPage.current

    previousPage.current = page

    // Do not move the user on the initial data load.
    if (
      previous === null
      || previous === page
    ) {
      return
    }

    scrollCatalogToStart()
  }, [page])
}
