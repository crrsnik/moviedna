import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

import { countryLabel } from './countryDisplay.js'

const COUNTRY_CODES = [
  'US', 'GB', 'FR', 'DE', 'IT', 'ES',
  'CH', 'AT', 'BE', 'NL', 'IE', 'PT',
  'SE', 'NO', 'DK', 'FI', 'IS',
  'PL', 'CZ', 'SK', 'HU', 'RO',
  'BG', 'HR', 'SI', 'RS',
  'EE', 'LV', 'LT',
  'UA', 'RU', 'GE',
  'GR', 'TR',
  'CA', 'MX', 'BR', 'AR', 'CL', 'CO',
  'AU', 'NZ',
  'JP', 'KR', 'CN', 'HK', 'TW',
  'IN', 'TH', 'ID', 'PH', 'VN',
  'SG', 'MY',
  'IL', 'IR',
  'ZA', 'EG', 'MA',
]

const COPY = {
  en: {
    label: 'Origin country',
    all: 'All countries',
  },
  fr: {
    label: "Pays d'origine",
    all: 'Tous les pays',
  },
  ru: {
    label: 'Страна',
    all: 'Все страны',
  },
}

function language(locale) {
  return (
    typeof locale === 'string'
      ? locale.split('-')[0]
      : 'en'
  )
}

export default function CountryFilter({
  selected = null,
  onChange,
}) {
  const { locale } = useTranslation()

  const lang = language(locale)
  const copy = COPY[lang] ?? COPY.en

  const countries = COUNTRY_CODES
    .map(code => ({
      code,
      name: countryLabel(
        code,
        locale,
      ),
    }))
    .sort(
      (a, b) => a.name.localeCompare(
        b.name,
        locale,
      ),
    )

  return (
    <section className="min-w-0 space-y-2">
      <label
        htmlFor="catalog-country-filter"
        className="block text-sm font-medium text-secondary"
      >
        {copy.label}
      </label>

      <select
        id="catalog-country-filter"
        value={selected ?? ''}
        onChange={event => (
          onChange(
            event.target.value || null,
          )
        )}
        className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus-visible:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <option value="">
          {copy.all}
        </option>

        {countries.map(country => (
          <option
            key={country.code}
            value={country.code}
          >
            {country.name}
          </option>
        ))}
      </select>
    </section>
  )
}
