import Pusher from 'pusher-js'

export function createPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) {
    return null
  }

  return new Pusher(key, {
    cluster,
    forceTLS: true
  })
}
