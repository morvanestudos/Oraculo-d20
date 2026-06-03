import type { Npc, NpcUpdate } from './types'

/** Clamp values to valid ranges */
export function clampNpc(npc: Partial<Npc>): Partial<Npc> {
  const out = { ...npc }
  if (out.trust !== undefined) out.trust = Math.max(-10, Math.min(10, out.trust))
  if (out.fear  !== undefined) out.fear  = Math.max(0, Math.min(10, out.fear))
  return out
}

/** Apply an NpcUpdate delta to a persisted Npc */
export function applyNpcUpdate(npc: Npc, upd: NpcUpdate): Partial<Npc> {
  const patch: Partial<Npc> = {}
  if (upd.mood)            patch.mood            = upd.mood
  if (upd.knownInfo)       patch.knownInfo       = upd.knownInfo
  if (upd.lastInteraction) patch.lastInteraction = upd.lastInteraction
  if (upd.trustChange)     patch.trust = Math.max(-10, Math.min(10, (npc.trust ?? 0) + upd.trustChange))
  if (upd.fearChange)      patch.fear  = Math.max(0,   Math.min(10, (npc.fear  ?? 0) + upd.fearChange))
  return patch
}

/** Build chat message for relationship changes (only for strong shifts) */
export function buildRelationshipMessage(npcName: string, upd: NpcUpdate): string | null {
  const tc = upd.trustChange ?? 0
  const fc = upd.fearChange  ?? 0
  if (tc >= 2)  return `🤝 ${npcName} parece confiar mais no grupo.`
  if (tc <= -2) return `⚠️ ${npcName} parece desconfiar mais do grupo.`
  if (fc >= 3)  return `😨 ${npcName} parece assustado.`
  return null
}
