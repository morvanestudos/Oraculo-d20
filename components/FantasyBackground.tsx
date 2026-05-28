'use client'

import React, { ReactNode, useEffect, useState } from 'react'

interface FantasyBackgroundProps {
  image?: string
  children: ReactNode
  overlayIntensity?: number
}

export default function FantasyBackground({
  image = '/images/bg-home.jpg',
  children,
  overlayIntensity = 0.68
}: FantasyBackgroundProps) {
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    console.log('BACKGROUND IMAGE:', image)
    if (!image) {
      setImageError(true)
      return
    }
    const img = new Image()
    img.src = image
    img.onload = () => setImageError(false)
    img.onerror = () => setImageError(true)
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [image])

  // Cap overlay to a sensible max so it doesn't hide the background
  const intensity = Math.min(overlayIntensity, 0.5)

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image with fallback */}
      {!imageError && image ? (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${image})` }}
        />
      ) : null}

      {/* Fallback gradient if no image */}
      {(imageError || !image) && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#120b08] via-[#1a0f08] to-[#140014]" />
      )}

      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: `rgba(0, 0, 0, ${intensity})`
        }}
      />

      {/* Arcane glow overlay */}
      <div className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/15 to-transparent" />
      </div>

      {/* Rune/texture pattern overlay */}
      <div
        className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(212,177,106,0.1) 1px, transparent 1px),
            linear-gradient(rgba(212,177,106,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  )
}
