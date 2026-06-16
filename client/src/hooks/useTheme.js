import { useConfigurator } from './useConfigurator.js'
import { resolveTheme } from '../data/themeTemplates.js'

/** Returns the active { template, accentColor } based on tenantConfiguration.theme. */
export function useTheme() {
  const { state } = useConfigurator()
  return resolveTheme(state.tenantConfiguration.theme)
}
