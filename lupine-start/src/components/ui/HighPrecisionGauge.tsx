import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface GaugeProps {
  value: number // 0 to 100
  size?: number
  strokeWidth?: number
  threshold?: number // If value > threshold, turn violet
  label?: string
  className?: string
}

export function HighPrecisionGauge({
  value,
  size = 120,
  strokeWidth = 6,
  threshold = 80,
  label,
  className
}: GaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  const isCritical = value >= threshold

  const strokeColor = isCritical ? 'var(--secondary)' : 'var(--primary)'
  const glowClass = isCritical ? 'glow-secondary text-[var(--secondary)]' : 'glow-primary text-[var(--primary)]'

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--outline-variant)"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        {/* Animated value track */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 10px ${strokeColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-serif text-2xl tracking-tighter", glowClass)}>
          {Math.round(value)}
        </span>
        {label && (
          <span className="mono-label text-[9px] mt-1 text-[var(--on-surface-variant)] uppercase tracking-[0.08em] text-center max-w-[80%] leading-none">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
