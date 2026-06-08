import { useContext } from 'react'
import { ConfiguratorContext } from '../context/ConfiguratorContext.jsx'
import { ACTIONS } from '../context/configuratorReducer.js'

export function useConfigurator() {
  const ctx = useContext(ConfiguratorContext)
  if (!ctx) throw new Error('useConfigurator must be used inside ConfiguratorProvider')
  return { ...ctx, ACTIONS }
}
