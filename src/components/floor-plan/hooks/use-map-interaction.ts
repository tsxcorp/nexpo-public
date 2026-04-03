'use client'

import { useState, useCallback, useRef } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.3
const MAX_ZOOM = 5
const ZOOM_STEP = 0.15

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapInteractionState {
  zoom: number
  panX: number
  panY: number
}

export interface MapInteractionHandlers {
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void
  onTouchStart: (e: React.TouchEvent<SVGSVGElement>) => void
  onTouchMove: (e: React.TouchEvent<SVGSVGElement>) => void
  onTouchEnd: () => void
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp: () => void
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMapInteraction(initialZoom = 1): MapInteractionState & MapInteractionHandlers {
  const [zoom, setZoom] = useState(initialZoom)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Mouse drag state — not reactive, stored in refs to avoid re-renders
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Pinch-to-zoom state
  const lastPinchDistance = useRef<number | null>(null)

  // ── Mouse handlers ───────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY }
    e.preventDefault()
  }, [panX, panY])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPanX(dragStart.current.panX + dx)
    setPanY(dragStart.current.panY + dy)
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // ── Wheel zoom ───────────────────────────────────────────────────────────

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev - e.deltaY * 0.001)))
  }, [])

  // ── Touch handlers ───────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      // Start pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistance.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1) {
      // Start single-finger pan
      isDragging.current = true
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX,
        panY,
      }
    }
  }, [panX, panY])

  const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      // Pinch-to-zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (lastPinchDistance.current !== null) {
        const scale = dist / lastPinchDistance.current
        setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * scale)))
      }
      lastPinchDistance.current = dist
    } else if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setPanX(dragStart.current.panX + dx)
      setPanY(dragStart.current.panY + dy)
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    isDragging.current = false
    lastPinchDistance.current = null
  }, [])

  // ── Zoom controls ────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP)), [])
  const fitView = useCallback(() => { setZoom(1); setPanX(0); setPanY(0) }, [])

  return {
    zoom,
    panX,
    panY,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    zoomIn,
    zoomOut,
    fitView,
  }
}
