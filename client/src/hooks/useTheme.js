import { useConfigurator } from './useConfigurator.js'
import { resolveTheme } from '../data/themeTemplates.js'
import { useBackgroundImageAnalysis } from './useBackgroundImageAnalysis.js'

/** Returns the active { template, accentColor, backgroundImageUrl, textScheme, showFallbackScrim } based on tenantConfiguration.theme. */
export function useTheme() {
  const { state } = useConfigurator()
  const themeState = state.tenantConfiguration.theme
  const { template, accentColor: baseAccentColor } = resolveTheme(themeState)
  const backgroundImageUrl = themeState?.backgroundImageUrl || null
  const { accentColor: extractedAccentColor, textScheme, usedFallback } = useBackgroundImageAnalysis(backgroundImageUrl)

  const accentColor = themeState?.accentColor || extractedAccentColor || baseAccentColor

  return {
    template,
    accentColor,
    backgroundImageUrl,
    textScheme: backgroundImageUrl ? textScheme : null,
    showFallbackScrim: Boolean(backgroundImageUrl) && usedFallback,
  }
}
