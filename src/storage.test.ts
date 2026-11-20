import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type PracticeResult } from './quiz'
import { loadSavedData, saveSavedData } from './storage'

const storageKey = 'ear-challenge:v1'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('local practice storage', () => {
  it('round-trips settings and keeps only the ten most recent results', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    const history: PracticeResult[] = Array.from({ length: 12 }, (_, index) => ({
      id: `round-${index}`,
      completedAt: new Date(2026, 0, index + 1).toISOString(),
      mode: 'interval',
      difficulty: 'intermediate',
      correct: 4,
      total: 5,
      wrongAnswers: [],
    }))

    saveSavedData({
      settings: {
        ...DEFAULT_SETTINGS,
        mode: 'triad',
        difficulty: 'advanced',
        questionCount: 15,
        triadAnswerMode: 'root',
        playOnAnswerSelect: true,
      },
      history,
    })
    const saved = loadSavedData()

    expect(saved.settings).toEqual({
      ...DEFAULT_SETTINGS,
      mode: 'triad',
      difficulty: 'advanced',
      questionCount: 15,
      triadAnswerMode: 'root',
      playOnAnswerSelect: true,
    })
    expect(saved.history).toHaveLength(10)
    expect(saved.history[0].id).toBe('round-0')
    expect(saved.notice).toBe('')
    expect(values.has(storageKey)).toBe(true)
  })

  it('uses defaults and reports malformed saved data', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '{not json',
      setItem: vi.fn(),
    })

    const saved = loadSavedData()

    expect(saved.settings).toEqual(DEFAULT_SETTINGS)
    expect(saved.history).toEqual([])
    expect(saved.notice).toContain('無法讀取本機練習紀錄')
  })

  it('fills new settings with defaults when reading an existing saved settings object', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({
        settings: { mode: 'interval', difficulty: 'beginner', questionCount: 10 },
        history: [],
      }),
      setItem: vi.fn(),
    })

    expect(loadSavedData().settings).toEqual({
      ...DEFAULT_SETTINGS,
      mode: 'interval',
    })
  })

  it('surfaces storage write failures to the caller', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded') },
    })

    expect(() => saveSavedData({ settings: DEFAULT_SETTINGS, history: [] }))
      .toThrow('quota exceeded')
  })
})
