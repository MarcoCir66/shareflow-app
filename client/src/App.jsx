import { useState } from 'react'
import Navbar from './components/layout/Navbar.jsx'
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import BlockLibrary from './components/sidebar-left/BlockLibrary.jsx'
import CanvasDropZone from './components/canvas/CanvasDropZone.jsx'
import PropertiesPanel from './components/sidebar-right/PropertiesPanel.jsx'
import DeployModal from './components/deploy/DeployModal.jsx'

export default function App() {
  const [deployOpen, setDeployOpen] = useState(false)
  return (
    <>
      <Navbar onDeployClick={() => setDeployOpen(true)} />
      <WorkspaceShell
        left={<BlockLibrary />}
        center={<CanvasDropZone />}
        right={<PropertiesPanel />}
      />
      {deployOpen && <DeployModal onClose={() => setDeployOpen(false)} />}
    </>
  )
}
