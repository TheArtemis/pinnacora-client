import { Shape, ShapeGeometry } from 'three'

export function clampRoundedRectRadius(width: number, height: number, radius: number) {
  return Math.min(radius, width / 2, height / 2)
}

export function createRoundedRectShape(width: number, height: number, radius: number) {
  const r = clampRoundedRectRadius(width, height, radius)
  const x = -width / 2
  const y = -height / 2
  const shape = new Shape()

  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r)
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)

  return shape
}

export function createRoundedRectGeometry(width: number, height: number, radius: number) {
  return new ShapeGeometry(createRoundedRectShape(width, height, radius))
}

export function createRoundedRectInnerGeometry(
  width: number,
  height: number,
  radius: number,
  borderWidth: number,
) {
  const innerWidth = width - borderWidth * 2
  const innerHeight = height - borderWidth * 2

  if (innerWidth <= 0 || innerHeight <= 0) {
    return createRoundedRectGeometry(width, height, radius)
  }

  return createRoundedRectGeometry(
    innerWidth,
    innerHeight,
    Math.max(0, radius - borderWidth),
  )
}
