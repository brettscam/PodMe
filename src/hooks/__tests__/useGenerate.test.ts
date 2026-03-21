import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGenerate } from '../../hooks/useGenerate'

describe('useGenerate', () => {
  it('resets progress to idle state', () => {
    const { result } = renderHook(() => useGenerate())

    // Verify initial state
    expect(result.current.progress.status).toBe('idle')
    expect(result.current.progress.audioUrls).toEqual([])

    // Call reset (should work even from idle)
    act(() => {
      result.current.reset()
    })

    expect(result.current.progress.status).toBe('idle')
    expect(result.current.progress.audioUrls).toEqual([])
    expect(result.current.progress.currentSegment).toBe(0)
  })

  it('exposes loadCachedAudio function', () => {
    const { result } = renderHook(() => useGenerate())
    expect(typeof result.current.loadCachedAudio).toBe('function')
  })

  it('loadCachedAudio returns null for empty segments', async () => {
    const { result } = renderHook(() => useGenerate())
    const urls = await result.current.loadCachedAudio([])
    expect(urls).toBeNull()
  })
})
