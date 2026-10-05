export function countryLabel(
  code,
  locale = 'en',
) {
  if (!code) return ''

  try {
    const displayNames = new Intl.DisplayNames(
      [locale],
      {
        type: 'region',
      },
    )

    return displayNames.of(code) ?? code
  } catch {
    return code
  }
}
