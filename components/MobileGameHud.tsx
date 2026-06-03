'use client'
import React from 'react'

export type MobilePanel = 'chat' | 'hero' | 'dice' | 'quests' | 'table'

type Props = {
  active: MobilePanel
  onChange: (panel: MobilePanel) => void
  hasTurnActive?: boolean
  currentActorName?: string | null
  isMyTurn?: boolean
}

const TABS: { id: MobilePanel; icon: string; label: string }[] = [
  { id: 'chat',   icon: '💬', label: 'Chat'   },
  { id: 'hero',   icon: '🧙', label: 'Herói'  },
  { id: 'dice',   icon: '🎲', label: 'Dados'  },
  { id: 'quests', icon: '📜', label: 'Missões'},
  { id: 'table',  icon: '⚔️', label: 'Mesa'   },
]

export default function MobileGameHud({ active, onChange, hasTurnActive, currentActorName, isMyTurn }: Props) {
  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(8,6,4,0.96), rgba(4,3,2,0.99))',
        borderTop: '1px solid rgba(212,177,106,0.2)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Turn status strip */}
      {hasTurnActive && (
        <div
          className="text-xs text-center py-1 px-3"
          style={{
            background: isMyTurn ? 'rgba(212,177,106,0.1)' : 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            color: isMyTurn ? '#d4b16a' : 'rgba(255,255,255,0.3)',
          }}
        >
          {isMyTurn
            ? `⚔️ Sua vez de agir`
            : `⚔️ Vez de ${currentActorName ?? '...'}`}
        </div>
      )}

      {/* Tab buttons */}
      <div className="flex">
        {TABS.map(tab => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-all"
              style={{
                color: isActive ? '#d4b16a' : 'rgba(255,255,255,0.35)',
                background: isActive ? 'rgba(212,177,106,0.08)' : 'transparent',
                borderTop: isActive ? '2px solid rgba(212,177,106,0.6)' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.05em', fontWeight: isActive ? 600 : 400 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
