import {
  useTranslation,
} from '../hooks/useTranslation.js'

export default function LanguageSwitcher() {
  const {
    locale,
    setLocale,
    supportedLocales,
    t,
  } = useTranslation()

  return (
    <label
      className="shrink-0"
      title={t('language.label')}
    >
      <span className="sr-only">
        {t('language.label')}
      </span>

      <select
        value={locale}
        onChange={event => (
          setLocale(event.target.value)
        )}
        className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs font-semibold uppercase text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100"
      >
        {supportedLocales.map(
          supportedLocale => (
            <option
              key={supportedLocale}
              value={supportedLocale}
            >
              {supportedLocale.toUpperCase()}
            </option>
          ),
        )}
      </select>
    </label>
  )
}
