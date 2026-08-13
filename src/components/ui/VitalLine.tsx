/**
 * VitalLine — Health-One's signature motif.
 * A living ECG waveform that threads through the sidebar, header, loaders
 * and empty states. This is the one element every teammate should reuse
 * rather than re-invent, so the brand stays consistent across modules.
 */
export default function VitalLine({
  color = "#22D3EE",
  className = "",
  height = 40,
}: {
  color?: string
  className?: string
  height?: number
}) {
  return (
    <svg
      viewBox="0 0 240 40"
      width="100%"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M0 20 H60 L72 20 L80 4 L92 36 L100 20 L112 20 L120 12 L128 28 L136 20 H240"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="240"
        className="animate-pulseLine"
        style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
      />
    </svg>
  )
}
