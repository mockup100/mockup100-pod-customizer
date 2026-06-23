export function computeFloatingHoverOverlay<T extends string>(
  event: Event,
  options: {
    defaultPlacement: T
    overlayWidth: number
    overlayHeight: number
    minOverlayWidth?: number
    minOverlayHeight?: number
    viewportPadding?: number
    topSafePadding?: number
    gap?: number
  },
): { placement: T; style: Record<string, string> } {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement) || typeof window === "undefined") {
    return {
      placement: options.defaultPlacement,
      style: {},
    }
  }

  const viewportPadding = options.viewportPadding ?? 12
  const topSafePadding = options.topSafePadding ?? viewportPadding
  const gap = options.gap ?? 10
  const overlayWidth = Math.min(
    options.overlayWidth,
    Math.max(options.minOverlayWidth ?? 180, window.innerWidth - viewportPadding * 2),
  )
  const overlayHeight = Math.min(
    options.overlayHeight,
    Math.max(options.minOverlayHeight ?? 220, window.innerHeight - topSafePadding - viewportPadding),
  )
  const rect = target.getBoundingClientRect()
  const maxLeft = Math.max(viewportPadding, window.innerWidth - overlayWidth - viewportPadding)
  const maxTop = Math.max(topSafePadding, window.innerHeight - overlayHeight - viewportPadding)

  let left = rect.right + gap
  let top = rect.top

  const canPlaceRight = rect.right + gap + overlayWidth <= window.innerWidth - viewportPadding
  const canPlaceLeft = rect.left - gap - overlayWidth >= viewportPadding
  const canPlaceBottom = rect.bottom + gap + overlayHeight <= window.innerHeight - viewportPadding

  if (canPlaceRight) {
    left = rect.right + gap
    top = rect.top
  } else if (canPlaceLeft) {
    left = rect.left - overlayWidth - gap
    top = rect.top
  } else {
    left = Math.min(Math.max(viewportPadding, rect.left), maxLeft)
    top = canPlaceBottom ? rect.bottom + gap : rect.top - overlayHeight - gap
  }

  return {
    placement: options.defaultPlacement,
    style: {
      top: `${Math.min(Math.max(topSafePadding, top), maxTop)}px`,
      left: `${Math.min(Math.max(viewportPadding, left), maxLeft)}px`,
      transform: "none",
    },
  }
}
