import { describe, it, expect, vi } from 'vitest'

// Import the test setup file to ensure it's executed
import './test-setup'

describe('test-setup', () => {
  it('should set up window.matchMedia mock', () => {
    expect(window.matchMedia).toBeDefined()
    expect(vi.isMockFunction(window.matchMedia)).toBe(true)
    
    const matchMedia = window.matchMedia('(min-width: 768px)')
    expect(matchMedia).toMatchObject({
      matches: false,
      media: '(min-width: 768px)',
      onchange: null,
      addListener: expect.any(Function),
      removeListener: expect.any(Function),
      addEventListener: expect.any(Function),
      removeEventListener: expect.any(Function),
      dispatchEvent: expect.any(Function),
    })
  })

  it('should set up IntersectionObserver mock', () => {
    expect(global.IntersectionObserver).toBeDefined()
    expect(vi.isMockFunction(global.IntersectionObserver)).toBe(true)
    
    const observer = new IntersectionObserver(() => {})
    expect(observer).toMatchObject({
      observe: expect.any(Function),
      unobserve: expect.any(Function),
      disconnect: expect.any(Function),
    })
  })

  it('should set up ResizeObserver mock', () => {
    expect(global.ResizeObserver).toBeDefined()
    expect(vi.isMockFunction(global.ResizeObserver)).toBe(true)
    
    const observer = new ResizeObserver(() => {})
    expect(observer).toMatchObject({
      observe: expect.any(Function),
      unobserve: expect.any(Function),
      disconnect: expect.any(Function),
    })
  })

  it('should allow matchMedia to return different values', () => {
    const matchMedia = window.matchMedia('(max-width: 640px)')
    expect(matchMedia.matches).toBe(false)
    expect(matchMedia.media).toBe('(max-width: 640px)')
  })

  it('should allow calling mock functions without errors', () => {
    const matchMedia = window.matchMedia('test')
    
    expect(() => {
      matchMedia.addListener(() => {})
      matchMedia.removeListener(() => {})
      matchMedia.addEventListener('change', () => {})
      matchMedia.removeEventListener('change', () => {})
      matchMedia.dispatchEvent(new Event('change'))
    }).not.toThrow()
  })

  it('should allow intersection observer methods to be called', () => {
    const observer = new IntersectionObserver(() => {})
    const element = document.createElement('div')
    
    expect(() => {
      observer.observe(element)
      observer.unobserve(element)
      observer.disconnect()
    }).not.toThrow()
  })

  it('should allow resize observer methods to be called', () => {
    const observer = new ResizeObserver(() => {})
    const element = document.createElement('div')
    
    expect(() => {
      observer.observe(element)
      observer.unobserve(element)
      observer.disconnect()
    }).not.toThrow()
  })
})