import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import type { Card as CardType } from '../../game/cardTypes'

const textureCache = new Map<string, CanvasTexture>()

const CARD_TEXTURE_LOGICAL_WIDTH = 512
const CARD_TEXTURE_LOGICAL_HEIGHT = 736
const CARD_TEXTURE_RESOLUTION_SCALE = 3
const CARD_TEXTURE_ANISOTROPY = 16

const suitSymbols: Record<CardType['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  joker: 'Joker',
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function createTexture(cacheKey: string, draw: (context: CanvasRenderingContext2D, width: number, height: number) => void) {
  const cachedTexture = textureCache.get(cacheKey)

  if (cachedTexture) {
    return cachedTexture
  }

  const canvas = document.createElement('canvas')
  canvas.width = CARD_TEXTURE_LOGICAL_WIDTH * CARD_TEXTURE_RESOLUTION_SCALE
  canvas.height = CARD_TEXTURE_LOGICAL_HEIGHT * CARD_TEXTURE_RESOLUTION_SCALE

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not create card texture context.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.scale(CARD_TEXTURE_RESOLUTION_SCALE, CARD_TEXTURE_RESOLUTION_SCALE)
  draw(context, CARD_TEXTURE_LOGICAL_WIDTH, CARD_TEXTURE_LOGICAL_HEIGHT)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = CARD_TEXTURE_ANISOTROPY
  textureCache.set(cacheKey, texture)

  return texture
}

export function getCardBackTexture() {
  return createTexture('back', (context, width, height) => {
    context.fillStyle = '#ffffff'
    roundedRect(context, 8, 8, width - 16, height - 16, 44)
    context.fill()

    context.fillStyle = '#2563eb'
    roundedRect(context, 34, 34, width - 68, height - 68, 34)
    context.fill()

    context.strokeStyle = 'rgba(255, 255, 255, 0.62)'
    context.lineWidth = 12

    for (let index = -height; index < width; index += 76) {
      context.beginPath()
      context.moveTo(index, height)
      context.lineTo(index + height, 0)
      context.stroke()
    }

    context.fillStyle = 'rgba(255, 255, 255, 0.9)'
    context.font = '800 92px Inter, Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('P', width / 2, height / 2)
  })
}

export function getCardFaceTexture(card: CardType, borderColor?: string) {
  return createTexture(`face-${card.rank}-${card.suit}-${borderColor ?? 'default-border'}`, (context, width, height) => {
    const isRed = card.suit === 'diamonds' || card.suit === 'hearts'
    const color = isRed ? '#b3263a' : '#172033'
    const cornerSuitFont = card.suit === 'joker' ? '800 34px Inter, Arial, sans-serif' : '800 58px Georgia, serif'

    context.fillStyle = '#ffffff'
    roundedRect(context, 8, 8, width - 16, height - 16, 44)
    context.fill()

    context.strokeStyle = borderColor ?? 'rgba(8, 6, 13, 0.14)'
    context.lineWidth = borderColor ? 18 : 8
    roundedRect(context, 14, 14, width - 28, height - 28, 40)
    context.stroke()

    context.fillStyle = color
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.font = '800 86px Inter, Arial, sans-serif'
    context.fillText(card.rank, 48, 46)
    context.font = cornerSuitFont
    context.textAlign = 'center'
    context.fillText(suitSymbols[card.suit], 88, 128)

    context.font = card.suit === 'joker' ? '800 76px Inter, Arial, sans-serif' : '800 140px Georgia, serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(suitSymbols[card.suit], width / 2, height / 2 + 12)

    context.save()
    context.translate(width, height)
    context.rotate(Math.PI)
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.font = '800 86px Inter, Arial, sans-serif'
    context.fillText(card.rank, 48, 46)
    context.font = cornerSuitFont
    context.textAlign = 'center'
    context.fillText(suitSymbols[card.suit], 88, 128)
    context.restore()
  })
}
