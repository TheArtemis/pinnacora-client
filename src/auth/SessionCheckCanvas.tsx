import { useEffect, useRef } from 'react'
import { FULL_DECK, cardLabel } from '../game/deckCatalog'
import type { Card } from '../game/cardTypes'

const CARD_WIDTH = 42
const CARD_HEIGHT = 58
const CARD_RADIUS = 8

type SimCard = {
  label: string
  red: boolean
  alpha: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  vr: number
}

function hashUnit(index: number, salt: number) {
  return (((index + 1) * 2654435761 + salt * 1597334677) >>> 0) / 4294967296
}

function isRed(card: Card) {
  return card.suit === 'diamonds' || card.suit === 'hearts'
}

function spreadPosition(
  index: number,
  total: number,
  width: number,
  height: number,
) {
  const cols = 14
  const col = index % cols
  const row = Math.floor(index / cols)
  const rowCount = Math.ceil(total / cols)
  const jitterX = (hashUnit(index, 1) - 0.5) * 24
  const jitterY = (hashUnit(index, 2) - 0.5) * 24

  const maxX = Math.max(width - CARD_WIDTH, 1)
  const maxY = Math.max(height - CARD_HEIGHT, 1)
  const x = Math.min(maxX, Math.max(0, (col / Math.max(cols - 1, 1)) * maxX + jitterX))
  const y = Math.min(maxY, Math.max(0, (row / Math.max(rowCount - 1, 1)) * maxY + jitterY))

  return { x, y }
}

function createSimCards(width: number, height: number): SimCard[] {
  return FULL_DECK.map((card, index) => {
    const spread = spreadPosition(index, FULL_DECK.length, width, height)
    const speed = 55 + hashUnit(index, 3) * 85

    return {
      label: cardLabel(card),
      red: isRed(card),
      alpha: 0.45 + hashUnit(index, 4) * 0.35,
      x: spread.x,
      y: spread.y,
      vx: (hashUnit(index, 5) > 0.5 ? 1 : -1) * speed,
      vy: (hashUnit(index, 6) > 0.5 ? 1 : -1) * speed,
      rotation: hashUnit(index, 7) * 360,
      vr: (hashUnit(index, 8) - 0.5) * 50,
    }
  })
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawCard(ctx: CanvasRenderingContext2D, card: SimCard) {
  ctx.save()
  ctx.translate(card.x + CARD_WIDTH / 2, card.y + CARD_HEIGHT / 2)
  ctx.rotate((card.rotation * Math.PI) / 180)
  ctx.globalAlpha = card.alpha
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  drawRoundedRect(ctx, -CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS)

  const joker = card.label === 'Joker'
  ctx.fillStyle = joker ? 'rgba(239, 246, 255, 0.92)' : 'rgba(255, 255, 255, 0.88)'
  ctx.fill()
  ctx.strokeStyle = joker ? 'rgba(37, 99, 235, 0.16)' : 'rgba(17, 24, 39, 0.08)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = joker ? 'rgba(29, 78, 216, 0.88)' : card.red ? 'rgba(185, 28, 28, 0.78)' : 'rgba(17, 24, 39, 0.72)'
  ctx.font = joker
    ? '700 8px Inter, ui-sans-serif, system-ui, sans-serif'
    : '800 14px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(joker ? card.label.toUpperCase() : card.label, 0, 0)
  ctx.restore()
}

function stepCards(cards: SimCard[], width: number, height: number, deltaSeconds: number) {
  const maxX = width - CARD_WIDTH
  const maxY = height - CARD_HEIGHT

  for (const card of cards) {
    card.x += card.vx * deltaSeconds
    card.y += card.vy * deltaSeconds
    card.rotation += card.vr * deltaSeconds

    if (card.x <= 0) {
      card.x = 0
      card.vx = Math.abs(card.vx)
    } else if (card.x >= maxX) {
      card.x = maxX
      card.vx = -Math.abs(card.vx)
    }

    if (card.y <= 0) {
      card.y = 0
      card.vy = Math.abs(card.vy)
    } else if (card.y >= maxY) {
      card.y = maxY
      card.vy = -Math.abs(card.vy)
    }
  }
}

function startCanvasAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let cards: SimCard[] = []
  let frameId = 0
  let lastTime = 0
  let width = 0
  let height = 0
  let dpr = 1
  let running = !document.hidden

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cards = createSimCards(width, height)
    drawFrame(0)
  }

  function drawFrame(deltaSeconds: number) {
    if (!reducedMotion) {
      stepCards(cards, width, height, deltaSeconds)
    }

    ctx.clearRect(0, 0, width, height)

    for (const card of cards) {
      drawCard(ctx, card)
    }
  }

  function tick(time: number) {
    if (!running) {
      return
    }

    const deltaSeconds = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.05)
    lastTime = time
    drawFrame(deltaSeconds)
    frameId = requestAnimationFrame(tick)
  }

  function handleVisibilityChange() {
    running = !document.hidden
    if (running) {
      lastTime = 0
      frameId = requestAnimationFrame(tick)
    }
  }

  resize()
  frameId = requestAnimationFrame(tick)
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    running = false
    cancelAnimationFrame(frameId)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

export default function SessionCheckCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) {
      return
    }

    return startCanvasAnimation(canvas, ctx)
  }, [])

  return <canvas ref={canvasRef} className="session-check-bg__canvas" aria-hidden="true" />
}
