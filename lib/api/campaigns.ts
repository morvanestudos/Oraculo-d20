import type { CampaignMemory, CampaignMemoryUpdateDTO } from '../types'

export async function fetchCampaignMemory(campaignId: string): Promise<CampaignMemory | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/memory`)
    if (!response.ok) {
      console.error('Failed to fetch campaign memory:', response.statusText)
      return null
    }
    const data = await response.json()
    return data as CampaignMemory
  } catch (error) {
    console.error('Error fetching campaign memory:', error)
    return null
  }
}

export async function updateCampaignMemory(
  campaignId: string,
  update: CampaignMemoryUpdateDTO
): Promise<CampaignMemory | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/memory`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    })
    if (!response.ok) {
      console.error('Failed to update campaign memory:', response.statusText)
      return null
    }
    const data = await response.json()
    return data as CampaignMemory
  } catch (error) {
    console.error('Error updating campaign memory:', error)
    return null
  }
}

export async function initializeCampaignMemory(
  campaignId: string,
  campaignTitle: string
): Promise<CampaignMemory | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentScene: 'início da aventura',
        currentLocation: `os arredores da campanha ${campaignTitle}`,
        currentObjective: 'explorar e descobrir',
        currentThreat: 'desconhecido',
        tensionLevel: 1,
        turnCount: 0
      })
    })
    if (!response.ok) {
      console.error('Failed to initialize campaign memory:', response.statusText)
      return null
    }
    const data = await response.json()
    return data as CampaignMemory
  } catch (error) {
    console.error('Error initializing campaign memory:', error)
    return null
  }
}
