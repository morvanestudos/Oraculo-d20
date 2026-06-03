'use client'
import React, { useEffect, useRef, useState } from 'react'

type Props = {
  text: string
  compact?: boolean
}

// Strip markdown, symbols and extra whitespace before speaking
function cleanForSpeech(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1')      // bold
    .replace(/\*(.*?)\*/g, '$1')           // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '')    // code
    .replace(/#{1,6}\s/g, '')             // headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/[⚔️💬🔍⚠️🎲✅❌🌟💀💚🗡️💥🛡️⏱⚔]/g, '') // emoji
    .replace(/━+/g, '')                   // decorative lines
    .replace(/\n{3,}/g, '\n\n')           // collapse blank lines
    .replace(/\|.*\|/g, '')               // tables
    .trim()
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(v => v.lang === 'pt-BR' && v.localService) ??
    voices.find(v => v.lang === 'pt-BR') ??
    voices.find(v => v.lang.startsWith('pt')) ??
    null
  )
}

export default function NarrationButton({ text, compact = false }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel()
    }
  }, [])

  function stop() {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  function speak() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // Stop any ongoing narration first
    window.speechSynthesis.cancel()

    const cleaned = cleanForSpeech(text)
    if (!cleaned) return

    const utt = new SpeechSynthesisUtterance(cleaned)
    utt.lang    = 'pt-BR'
    utt.rate    = 0.95
    utt.pitch   = 0.85
    utt.volume  = 1

    // Try to set pt-BR voice — voices may not be loaded yet, so retry once
    const setVoice = () => {
      const voice = getBestVoice()
      if (voice) utt.voice = voice
    }
    setVoice()
    if (!utt.voice) {
      window.speechSynthesis.onvoiceschanged = () => { setVoice(); window.speechSynthesis.onvoiceschanged = null }
    }

    utt.onstart = () => setSpeaking(true)
    utt.onend   = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)

    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
    setSpeaking(true)
  }

  if (compact) {
    return (
      <button
        onClick={speaking ? stop : speak}
        aria-label={speaking ? 'Parar narração' : 'Ouvir narração'}
        title={speaking ? 'Parar' : 'Ouvir narração'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.85rem',
          opacity: 0.55,
          padding: '2px 4px',
          lineHeight: 1,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = speaking ? '1' : '0.55')}
      >
        {speaking ? '⏹' : '🔊'}
      </button>
    )
  }

  return (
    <button
      onClick={speaking ? stop : speak}
      aria-label={speaking ? 'Parar narração' : 'Ouvir narração'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: speaking ? 'rgba(239,68,68,0.08)' : 'rgba(212,177,106,0.06)',
        border: speaking ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(212,177,106,0.2)',
        borderRadius: 4,
        color: speaking ? '#f87171' : 'rgba(212,177,106,0.7)',
        fontSize: '0.65rem',
        letterSpacing: '0.06em',
        padding: '3px 8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {speaking ? '⏹ Parar' : '🔊 Ouvir'}
    </button>
  )
}
