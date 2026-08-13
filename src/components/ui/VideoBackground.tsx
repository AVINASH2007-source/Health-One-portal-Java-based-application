import { useEffect, useRef, useState } from 'react'

/**
 * VideoBackground — the app's global background.
 *
 * Mounted exactly once in App.tsx, outside <Routes>, so client-side
 * navigation between pages never unmounts/remounts it and the video is
 * never interrupted or restarted while moving through the app.
 *
 * `position: fixed` + `inset: 0` + `z-index: -10` pins it behind every
 * route's content for the lifetime of the app. Two <video> elements share
 * the same source: while one plays, the other is preloaded and paused at
 * frame 0. Shortly before the active one ends, the standby one starts and
 * the two crossfade opacity, then the finished one rewinds silently for
 * its next turn. This masks the native `loop` restart, which on many
 * browsers produces a visible stutter right at the seam — so the loop
 * reads as one continuous, uninterrupted playback forever.
 */
export default function VideoBackground({
  src,
  poster,
  crossfadeSeconds = 0.6,
}: {
  src: string
  poster?: string
  crossfadeSeconds?: number
}) {
  const videoA = useRef<HTMLVideoElement>(null)
  const videoB = useRef<HTMLVideoElement>(null)
  const [activeIsA, setActiveIsA] = useState(true)
  const activeIsARef = useRef(true)
  const swappingRef = useRef(false)
  const rafRef = useRef<number>()

  useEffect(() => {
    activeIsARef.current = activeIsA
  }, [activeIsA])

  useEffect(() => {
    const a = videoA.current
    const b = videoB.current
    if (!a || !b) return

    a.muted = true
    b.muted = true
    b.currentTime = 0
    a.play().catch(() => {})

    const tick = () => {
      const active = activeIsARef.current ? a : b
      const standby = activeIsARef.current ? b : a

      if (!swappingRef.current && active.duration && active.currentTime >= active.duration - crossfadeSeconds) {
        swappingRef.current = true
        standby.currentTime = 0
        standby.play().catch(() => {})
        setActiveIsA((prev) => !prev)
        window.setTimeout(() => {
          active.pause()
          active.currentTime = 0
          swappingRef.current = false
        }, crossfadeSeconds * 1000 + 80)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const videoStyle = (opacity: number): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity,
    transition: `opacity ${crossfadeSeconds}s linear`,
  })

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: -10, overflow: 'hidden' }}
    >
      <video
        ref={videoA}
        src={src}
        poster={poster}
        autoPlay
        loop={false}
        muted
        playsInline
        preload="auto"
        style={videoStyle(activeIsA ? 1 : 0)}
      />
      <video
        ref={videoB}
        src={src}
        autoPlay
        loop={false}
        muted
        playsInline
        preload="auto"
        style={videoStyle(activeIsA ? 0 : 1)}
      />
      {/* thin overlay for text legibility — video stays clearly visible */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,20,40,0.18)' }} />
    </div>
  )
}
