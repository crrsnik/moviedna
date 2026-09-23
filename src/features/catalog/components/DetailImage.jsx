import { useState } from 'react'
export default function DetailImage({ src, alt, className, placeholder = 'No image available', lazy = true }) {
  const [failed, setFailed] = useState(null)
  return <div className={`flex items-center justify-center overflow-hidden bg-zinc-900 ${className}`}>
    {src && failed !== src ? <img src={src} alt={alt} loading={lazy ? 'lazy' : 'eager'} onError={() => setFailed(src)} className="h-full w-full object-cover" /> : <span className="px-3 text-center text-sm text-zinc-500">{placeholder}</span>}
  </div>
}
