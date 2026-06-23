import { useEffect, useState } from 'react'
import { computePaletteFromAverage, LIGHT_TEXT_SCHEME } from '../utils/imagePalette.js'

const FALLBACK_RESULT = { accentColor: null, textScheme: LIGHT_TEXT_SCHEME, usedFallback: true }

function analyzeImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0, g = 0, b = 0
        const pixelCount = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }
        r = Math.round(r / pixelCount)
        g = Math.round(g / pixelCount)
        b = Math.round(b / pixelCount)
        resolve({ ...computePaletteFromAverage(r, g, b), usedFallback: false })
      } catch {
        resolve(FALLBACK_RESULT)
      }
    }
    img.onerror = () => resolve(FALLBACK_RESULT)
    img.src = url
  })
}

/** Analyzes a background image URL for a suggested accent color and a readable text scheme. */
export function useBackgroundImageAnalysis(url) {
  const [result, setResult] = useState(FALLBACK_RESULT)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    analyzeImage(url).then(r => {
      if (!cancelled) setResult(r)
    })
    return () => { cancelled = true }
  }, [url])

  return url ? result : FALLBACK_RESULT
}
