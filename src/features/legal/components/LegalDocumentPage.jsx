import {
  Link,
} from 'react-router-dom'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import {
  getLegalDocument,
} from '../content/legalDocuments.js'

export default function LegalDocumentPage({
  type,
}) {
  const { locale } = useTranslation()

  const document =
    getLegalDocument(
      type,
      locale,
    )

  return (
    <article className="mx-auto w-full max-w-3xl space-y-8 py-4 sm:py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {document.title}
        </h1>

        <p className="text-sm text-tertiary">
          {document.updatedLabel}:{' '}
          {document.updated}
        </p>

        <p className="max-w-2xl leading-7 text-secondary">
          {document.intro}
        </p>
      </header>

      <div className="space-y-8">
        {document.sections.map(
          section => (
            <section
              key={section.title}
              className="space-y-3"
            >
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>

              {section.paragraphs.map(
                paragraph => (
                  <p
                    key={paragraph}
                    className="leading-7 text-secondary"
                  >
                    {paragraph}
                  </p>
                ),
              )}
            </section>
          ),
        )}
      </div>

      <nav
        aria-label="Legal documents"
        className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm"
      >
        <Link
          to="/terms"
          className="rounded text-primary underline underline-offset-4 hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {
            getLegalDocument(
              'terms',
              locale,
            ).title
          }
        </Link>

        <Link
          to="/privacy"
          className="rounded text-primary underline underline-offset-4 hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {
            getLegalDocument(
              'privacy',
              locale,
            ).title
          }
        </Link>
      </nav>
    </article>
  )
}
