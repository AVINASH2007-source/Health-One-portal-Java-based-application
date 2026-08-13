import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'

export default function AnimatedCounter({
  value,
  suffix = '',
  className = '',
}: {
  value: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { duration: 1200, bounce: 0 })

  useEffect(() => {
    if (inView) motionVal.set(value)
  }, [inView, value])

  useEffect(() => {
    return spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix
    })
  }, [spring, suffix])

  return (
    <motion.span ref={ref} className={className}>
      0{suffix}
    </motion.span>
  )
}
