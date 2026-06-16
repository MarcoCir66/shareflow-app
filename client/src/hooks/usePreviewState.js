import { useState, useEffect } from 'react'

const CHANNEL_NAME = 'shareflow-preview'
const STORAGE_KEY  = 'shareflow-preview'

export function usePreviewState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = e => {
      if (e.data?.type === 'state-update') setState(e.data.state)
    }
    return () => channel.close()
  }, [])

  return state
}
