import { useEffect, useRef, type RefObject } from 'react'

type ConfettiShape = 'rect' | 'circle' | 'strip'

type Particle = {
  element: HTMLSpanElement
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  spin: number
  width: number
  height: number
  hue: number
  shape: ConfettiShape
  layer: 'behind' | 'front'
  wobblePhase: number
  wobbleSpeed: number
  releaseAt: number
}

type ConfettiBurstProps = {
  panelRef: RefObject<HTMLElement | null>
}

const GRAVITY = 920
const AIR_DRAG = 0.34
const PARTICLE_COUNT = 64
const MAX_DURATION_MS = 5200
const BURST_DELAY_MS = 200
const SHAPES: ConfettiShape[] = ['rect', 'circle', 'strip']

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function createParticleElement(shape: ConfettiShape, width: number, height: number, hue: number) {
  const element = document.createElement('span')
  element.className = `game-end-overlay__confetti-piece game-end-overlay__confetti-piece--${shape}`
  element.style.width = `${width}px`
  element.style.height = `${height}px`
  element.style.background = `hsl(${hue} 78% 52%)`
  element.style.opacity = '0'
  return element
}

function createParticles(originX: number, originY: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const width = shape === 'strip' ? randomBetween(3, 6) : randomBetween(5, 11)
    const height = shape === 'circle' ? width : randomBetween(7, 18)
    const angle = randomBetween(-Math.PI * 0.98, Math.PI * 0.98)
    const speed = randomBetween(420, 980)
    const hue = randomBetween(18, 320)

    return {
      x: originX + randomBetween(-52, 52),
      y: originY + randomBetween(-28, 28),
      vx: Math.cos(angle) * speed + randomBetween(-160, 160),
      vy: Math.sin(angle) * speed + randomBetween(-180, 80),
      rotation: randomBetween(0, 360),
      spin: randomBetween(-560, 560),
      width,
      height,
      hue,
      shape,
      wobblePhase: randomBetween(0, Math.PI * 2),
      wobbleSpeed: randomBetween(5, 14),
      releaseAt: BURST_DELAY_MS + randomBetween(0, 360),
      element: createParticleElement(shape, width, height, hue),
      layer: 'behind' as const,
    }
  })
}

function applyParticleTransform(particle: Particle) {
  const x = particle.x - particle.width / 2
  const y = particle.y - particle.height / 2
  particle.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${particle.rotation}deg)`
}

function shouldMoveToFront(particle: Particle, panelWidth: number) {
  const halfWidth = particle.width / 2
  const halfHeight = particle.height / 2

  return (
    particle.y - halfHeight <= 0 ||
    particle.x - halfWidth <= 0 ||
    particle.x + halfWidth >= panelWidth
  )
}

function particleOpacity(particle: Particle, panelHeight: number) {
  if (particle.layer === 'behind') {
    return 0.42
  }

  const fallProgress = (particle.y - panelHeight * 0.35) / (panelHeight * 1.1)
  return Math.max(0, Math.min(1, 1.05 - fallProgress * 0.95))
}

export default function ConfettiBurst({ panelRef }: ConfettiBurstProps) {
  const behindRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = panelRef.current
    const behindLayer = behindRef.current
    const frontLayer = frontRef.current

    if (!stage || !behindLayer || !frontLayer) {
      return
    }

    const panel = stage
    const behind = behindLayer
    const front = frontLayer

    let frameId = 0
    let lastTime = performance.now()
    let startedAt = 0
    let panelWidth = 0
    let panelHeight = 0
    let particles: Particle[] = []

    function initializeParticles() {
      panelWidth = panel.clientWidth
      panelHeight = panel.clientHeight

      if (panelWidth === 0 || panelHeight === 0) {
        return false
      }

      particles = createParticles(panelWidth / 2, panelHeight * 0.5)
      startedAt = performance.now()
      behind.replaceChildren()
      front.replaceChildren()

      for (const particle of particles) {
        behind.append(particle.element)
        applyParticleTransform(particle)
      }

      return true
    }

    function moveParticleToFront(particle: Particle) {
      if (particle.layer === 'front') {
        return
      }

      particle.layer = 'front'
      front.append(particle.element)
    }

    function tick(now: number) {
      if (startedAt === 0) {
        if (!initializeParticles()) {
          frameId = requestAnimationFrame(tick)
          return
        }
      }

      const elapsed = now - startedAt

      if (elapsed > MAX_DURATION_MS) {
        return
      }

      const delta = Math.min((now - lastTime) / 1000, 0.032)
      lastTime = now

      for (const particle of particles) {
        if (elapsed < particle.releaseAt) {
          particle.element.style.opacity = '0'
          continue
        }

        particle.wobblePhase += particle.wobbleSpeed * delta
        particle.vx += Math.sin(particle.wobblePhase) * 52 * delta
        particle.vy += GRAVITY * delta
        particle.vx *= Math.max(0, 1 - AIR_DRAG * delta)
        particle.vy *= Math.max(0, 1 - AIR_DRAG * delta * 0.28)
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.rotation += particle.spin * delta

        if (particle.layer === 'behind' && shouldMoveToFront(particle, panelWidth)) {
          moveParticleToFront(particle)
        }

        if (particle.y - particle.height / 2 > panelHeight + 340) {
          particle.element.remove()
          continue
        }

        particle.element.style.opacity = String(particleOpacity(particle, panelHeight))
        applyParticleTransform(particle)
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      behind.replaceChildren()
      front.replaceChildren()
    }
  }, [panelRef])

  return (
    <>
      <div ref={behindRef} className="game-end-overlay__confetti-behind" aria-hidden="true" />
      <div ref={frontRef} className="game-end-overlay__confetti-front" aria-hidden="true" />
    </>
  )
}
