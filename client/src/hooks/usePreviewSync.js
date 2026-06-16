import { useEffect, useRef } from 'react'

const CHANNEL_NAME = 'shareflow-preview'
const STORAGE_KEY  = 'shareflow-preview'
const DEBOUNCE_MS  = 300

export function usePreviewSync(state) {
  const channelRef = useRef(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)
    return () => channelRef.current?.close()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const json = JSON.stringify(state)
      try {
        localStorage.setItem(STORAGE_KEY, json)
      } catch {
        // localStorage unavailable (quota exceeded or private browsing)
      }
      channelRef.current?.postMessage({ type: 'state-update', state })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])
}
