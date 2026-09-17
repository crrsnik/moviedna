function PagePlaceholder({ title, subtitle }) {
  return (
    <div className="max-w-2xl space-y-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl">
        {title}
      </h1>
      <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
        {subtitle}
      </p>
    </div>
  )
}

export default PagePlaceholder
