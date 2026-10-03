import { useState } from 'react'

import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

export default function DetailImage({
  src,
  alt,
  className,
  placeholder,
  lazy = true,
}) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(null)

  const fallback = (
    placeholder
    ?? t('mediaImage.unavailable')
  )

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-zinc-900 ${className}`}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          onError={() => setFailed(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="px-3 text-center text-sm text-zinc-500">
          {fallback}
        </span>
      )}
    </div>
  )
}
