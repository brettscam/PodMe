import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGenerate } from '../../hooks/useGenerate'

describe('useGenerate reset', () => {
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
})
