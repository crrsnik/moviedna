import { useContext } from 'react'

import {
  LanguageContext,
} from '../context/LanguageContext.jsx'

export function useTranslation() {
  const value = useContext(LanguageContext)

  if (!value) {
    throw new Error(
      'useTranslation must be used within LanguageProvider.',
    )
  }

  return value
}
