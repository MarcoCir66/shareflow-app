/**
 * Pure helpers for navigating/updating the sections → columns → widgets tree.
 */
import { t2 } from '../utils/localizedText.js'

/** @returns {{sectionId: string, columnId: string} | null} */
export function findWidgetLocation(sections, instanceId) {
  for (const section of sections) {
    for (const column of section.columns) {
      if (column.widgets.some(w => w.instanceId === instanceId)) {
        return { sectionId: section.sectionId, columnId: column.columnId }
      }
    }
  }
  return null
}

/** Returns the widget object with the given instanceId, or null if not found. */
export function findWidget(sections, instanceId) {
  for (const section of sections) {
    for (const column of section.columns) {
      const widget = column.widgets.find(w => w.instanceId === instanceId)
      if (widget) return widget
    }
  }
  return null
}

/** @returns {{sectionId: string, columnId: string} | null} */
export function findColumnById(sections, columnId) {
  for (const section of sections) {
    for (const column of section.columns) {
      if (column.columnId === columnId) {
        return { sectionId: section.sectionId, columnId: column.columnId }
      }
    }
  }
  return null
}

/** Returns a new `sections` array with the targeted column replaced by `updateFn(column)`. */
export function mapColumn(sections, sectionId, columnId, updateFn) {
  return sections.map(section => {
    if (section.sectionId !== sectionId) return section
    return {
      ...section,
      columns: section.columns.map(column =>
        column.columnId === columnId ? updateFn(column) : column
      ),
    }
  })
}

/** Flattens sections → columns → widgets into a flat array, recomputing `order`. */
export function flattenWidgets(sections) {
  const result = []
  for (const section of sections) {
    for (const column of section.columns) {
      for (const widget of column.widgets) {
        result.push({ ...widget, order: result.length })
      }
    }
  }
  return result
}

/**
 * Returns {instanceId, blockId, pageId, pageTitle} for every widget across
 * every page (not just the active one) whose props.mandatoryRead is true.
 */
export function collectMandatoryBlocks(pages, lang) {
  const result = []
  for (const page of pages) {
    for (const section of page.sections) {
      for (const column of section.columns) {
        for (const widget of column.widgets) {
          if (widget.props.mandatoryRead === true) {
            result.push({
              instanceId: widget.instanceId,
              blockId: widget.blockId,
              pageId: page.pageId,
              pageTitle: t2(page.title, lang),
            })
          }
        }
      }
    }
  }
  return result
}
