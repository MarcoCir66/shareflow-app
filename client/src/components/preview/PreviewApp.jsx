import { useState } from 'react'
import { usePreviewState } from '../../hooks/usePreviewState.js'
import { PreviewProvider } from './PreviewProvider.jsx'
import PreviewToolbar from './PreviewToolbar.jsx'
import { findPage } from '../../context/pageHelpers.js'
import { resolveTheme } from '../../data/themeTemplates.js'
import CanvasTopNav from '../canvas/CanvasTopNav.jsx'
import HeroBanner from '../canvas/HeroBanner.jsx'
import CanvasSection from '../canvas/CanvasSection.jsx'

const WIDTH = { desktop: '100%', tablet: '768px', mobile: '375px' }

export default function PreviewApp() {
  const [device, setDevice] = useState('desktop')
  const state = usePreviewState()

  if (!state) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-slate text-sm">
          Apri ShareFlow nell&apos;editor per vedere la preview.
        </p>
      </div>
    )
  }

  const { accentColor } = resolveTheme(state.tenantConfiguration.theme)
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <PreviewProvider state={state}>
      <div className="min-h-screen bg-surface flex flex-col">
        <PreviewToolbar device={device} onDevice={setDevice} />
        <div className="flex-1 overflow-y-auto p-6">
          <div
            data-device={device}
            style={{
              width: WIDTH[device],
              maxWidth: device === 'desktop' ? '1440px' : undefined,
              margin: '0 auto',
              '--theme-accent': accentColor,
            }}
          >
            <CanvasTopNav />
            <HeroBanner />
            {activePage.sections.map(section => (
              <CanvasSection key={section.sectionId} section={section} readOnly />
            ))}
          </div>
        </div>
      </div>
    </PreviewProvider>
  )
}
