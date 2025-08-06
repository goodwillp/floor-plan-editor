import { describe, it, expect } from 'vitest'

describe('Test Suite Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to DOM APIs', () => {
    const div = document.createElement('div')
    div.textContent = 'test'
    expect(div.textContent).toBe('test')
  })

  it('should have canvas mocking available', () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    expect(ctx).toBeDefined()
    expect(typeof ctx?.fillRect).toBe('function')
  })
})