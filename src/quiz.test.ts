import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SINGLE_NOTE_RANGES,
  createQuestion,
  getAnswerOptions,
  getNoteLabel,
  getNoteMidi,
  getNoteName,
  getOptionAudioQuestion,
  isAnswerCorrect,
  type Difficulty,
  type SingleNoteRange,
} from './quiz'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('quiz generation', () => {
  it('maps MIDI pitches to names with octaves and back', () => {
    expect(getNoteName(60)).toBe('C')
    expect(getNoteName(70)).toBe('A♯')
    expect(getNoteName(-1)).toBe('B')
    expect(getNoteLabel(60)).toBe('C4')
    expect(getNoteMidi('C4')).toBe(60)
    expect(getNoteMidi('A♯3')).toBe(58)
  })

  it('draws single notes only from the selected octave ranges', () => {
    const settings = { ...DEFAULT_SETTINGS, singleNoteRanges: ['C2-B2', 'C5-B5'] as SingleNoteRange[] }
    const values = [0.01, 0.99, 0.99, 0.5]
    vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0)

    const lowQuestion = createQuestion(settings)
    const highQuestion = createQuestion(settings)

    expect(lowQuestion.midi[0]).toBe(47)
    expect(highQuestion.midi[0]).toBe(78)
    expect(lowQuestion.answers).toEqual([getNoteName(lowQuestion.midi[0])])
    expect(highQuestion.answers).toEqual([getNoteName(highQuestion.midi[0])])
  })

  it('keeps interval quality answers within the selected difficulty list', () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'interval' as const }
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as Difficulty[]) {
      const question = createQuestion({ ...settings, difficulty })
      const options = getAnswerOptions(question, { ...settings, difficulty })
      expect(options).toContain(question.answers[0])
      expect(options).toHaveLength({ beginner: 6, intermediate: 11, advanced: 12 }[difficulty])
    }
  })

  it('uses the exact two octave-labelled pitches for interval note-answer mode', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      mode: 'interval' as const,
      intervalAnswerMode: 'notes' as const,
    }
    const question = createQuestion(settings)
    const options = getAnswerOptions(question, settings)

    expect(question.answers).toEqual(question.midi.map(getNoteLabel))
    expect(question.answers).toHaveLength(2)
    expect(question.answers.every((answer) => options.includes(answer))).toBe(true)
    expect(question.midi[1]).toBeGreaterThan(question.midi[0])

    const preview = getOptionAudioQuestion(question, question.answers[1])
    expect(preview?.mode).toBe('single-note')
    expect(preview?.midi).toEqual([question.midi[1]])
  })

  it('supports triad quality, chord-tone, and root-note answers', () => {
    const baseSettings = { ...DEFAULT_SETTINGS, mode: 'triad' as const }
    for (const triadAnswerMode of ['quality', 'notes', 'root'] as const) {
      const settings = { ...baseSettings, triadAnswerMode }
      const question = createQuestion(settings)
      const options = getAnswerOptions(question, settings)
      expect(question.answers.every((answer) => options.includes(answer))).toBe(true)
      if (triadAnswerMode === 'notes') {
        expect(question.answers).toEqual(question.midi.map(getNoteLabel))
        expect(question.answers).toHaveLength(3)
      } else if (triadAnswerMode === 'root') {
        expect(question.answers).toEqual([getNoteLabel(question.midi[0])])
      }
    }
  })

  it('samples a single note for note-list options and a chord for quality options', () => {
    const singleNoteQuestion = {
      mode: 'single-note' as const,
      prompt: '你聽到的是哪個音？',
      answers: ['C'],
      midi: [60],
      answerMode: 'pitch' as const,
      difficulty: 'beginner' as const,
    }
    const singleNotePreview = getOptionAudioQuestion(singleNoteQuestion, 'D')
    expect(singleNotePreview?.midi).toEqual([62])

    const triadSettings = { ...DEFAULT_SETTINGS, mode: 'triad' as const, triadAnswerMode: 'notes' as const }
    const triad = createQuestion(triadSettings)
    const notePreview = getOptionAudioQuestion(triad, triad.answers[0])
    expect(notePreview?.mode).toBe('single-note')
    expect(notePreview?.midi).toEqual([triad.midi[0]])

    const qualitySettings = { ...triadSettings, triadAnswerMode: 'quality' as const }
    const qualityQuestion = createQuestion(qualitySettings)
    const chordPreview = getOptionAudioQuestion(qualityQuestion, qualityQuestion.answers[0])
    expect(chordPreview?.mode).toBe('triad')
    expect(chordPreview?.midi).toHaveLength(3)
  })

  it('defines five octave ranges for single-note practice', () => {
    expect(SINGLE_NOTE_RANGES.map((range) => range.label)).toEqual([
      'C2–B2', 'C3–B3', 'C4–B4', 'C5–B5', 'C6–B6',
    ])
  })

  it('grades multi-select answers without relying on selection order', () => {
    expect(isAnswerCorrect(['D4', 'G4'], ['G4', 'D4'])).toBe(true)
    expect(isAnswerCorrect(['D4', 'G4'], ['D4', 'A4'])).toBe(false)
    expect(isAnswerCorrect(['D4'], ['D4', 'G4'])).toBe(false)
    expect(isAnswerCorrect(['D4', 'G4', 'A4'], ['D4', 'G4'])).toBe(false)
  })
})
