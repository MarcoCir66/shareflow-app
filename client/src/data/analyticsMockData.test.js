import { test, expect } from 'vitest'
import { PERIODS, getAnalyticsData } from './analyticsMockData.js'

test('getAnalyticsData returns 12 sites, 15 pages, 15 news, 15 documents for every period', () => {
  for (const period of PERIODS) {
    const data = getAnalyticsData(period)
    expect(data.sites).toHaveLength(12)
    expect(data.pages).toHaveLength(15)
    expect(data.news).toHaveLength(15)
    expect(data.documents).toHaveLength(15)
  }
})

test('hub uniqueVisitors and visits equal the sum across all sites', () => {
  const data = getAnalyticsData('last30')
  const sumUnique = data.sites.reduce((sum, s) => sum + s.uniqueVisitors, 0)
  const sumVisits = data.sites.reduce((sum, s) => sum + s.visits, 0)
  expect(data.hub.uniqueVisitors).toBe(sumUnique)
  expect(data.hub.visits).toBe(sumVisits)
})

test('hub device percentages sum to 100', () => {
  const data = getAnalyticsData('ytd')
  const { desktop, mobile, tablet } = data.hub.devicePct
  expect(desktop + mobile + tablet).toBe(100)
})
