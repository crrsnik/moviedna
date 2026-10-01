const VALIDATION_KEYS = Object.freeze({
  'Enter at least 2 characters.':
    'catalog.validation.minQuery',

  'Use no more than 100 characters.':
    'catalog.validation.maxQuery',
})

export function translateCatalogValidation(
  t,
  message,
) {
  if (!message) return message

  const key = VALIDATION_KEYS[message]

  return key
    ? t(key)
    : message
}
