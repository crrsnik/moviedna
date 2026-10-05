import {
  getDnaTraitColor,
} from '../utils/dnaTraitColors.js'

export default function DnaTraitBar({
  dimension,
  traitKey,
  label,
  percent,
  ariaLabel,
  negative = false,
}) {
  const normalizedPercent = Math.max(
    0,
    Math.min(100, Math.round(percent)),
  )

  const color = getDnaTraitColor({
    dimension,
    key: traitKey,
    label,
  })

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={normalizedPercent}
      className="
        mt-3 h-2 w-full overflow-hidden
        rounded-full bg-border
      "
    >
      <div
        aria-hidden="true"
        className="
          h-full rounded-full
          transition-[width] duration-300
          motion-reduce:transition-none
        "
        style={{
          width: `${normalizedPercent}%`,
          backgroundColor: color,
          opacity: negative ? 0.72 : 1,
        }}
      />
    </div>
  )
}
