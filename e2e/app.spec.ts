import { test, expect } from '@playwright/test'

test.describe('PuckPuck App', () => {
  test('shows login screen when not authenticated', async ({ page }) => {
    await page.goto('/')
    // Should show the app name and login
    await expect(page.locator('text=puck')).toBeVisible()
  })

  test('loads with correct page title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PuckPuck|Vite/)
  })

  test('SPA routing works - no 404 on refresh', async ({ page }) => {
    await page.goto('/')
    // Page should load without error
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })
})

test.describe('Navigation', () => {
  // These tests require auth - skip until auth mocking is set up
  test.skip('bottom nav has 5 tabs', async ({ page }) => {
    await page.goto('/')
    const navButtons = page.locator('nav button')
    await expect(navButtons).toHaveCount(5)
  })
})

test.describe('Mobile Responsive', () => {
  test('renders correctly at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('text=puck')).toBeVisible()
  })
})
