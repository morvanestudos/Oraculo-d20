import type { Message, MessageCreateDTO } from '../types'

export async function createMessage(
  campaignId: string,
  payload: MessageCreateDTO
): Promise<Message | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('createMessage: API retornou', response.status)
      return null
    }

    return (await response.json()) as Message
  } catch (error) {
    console.error('createMessage: falha na requisição', error)
    return null
  }
}
