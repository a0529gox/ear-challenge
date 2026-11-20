export type QuestionMode = 'single-note' | 'interval' | 'triad'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type SingleNoteRange = 'C2-B2' | 'C3-B3' | 'C4-B4' | 'C5-B5' | 'C6-B6'
export type IntervalAnswerMode = 'quality' | 'notes'
export type TriadAnswerMode = 'quality' | 'notes' | 'root'

export type QuizSettings = {
  mode: QuestionMode
  difficulty: Difficulty
  questionCount: number
  singleNoteRanges: SingleNoteRange[]
  intervalAnswerMode: IntervalAnswerMode
  triadAnswerMode: TriadAnswerMode
  playOnAnswerSelect: boolean
}

export type Question = {
  mode: QuestionMode
  prompt: string
  answers: string[]
  midi: number[]
  answerMode: IntervalAnswerMode | TriadAnswerMode | 'pitch'
  difficulty: Difficulty
}

export type WrongAnswer = {
  prompt: string
  correctAnswer: string
  selectedAnswer: string
}

export type PracticeResult = {
  id: string
  completedAt: string
  mode: QuestionMode
  answerMode?: Question['answerMode']
  difficulty: Difficulty
  correct: number
  total: number
  wrongAnswers: WrongAnswer[]
}

export const DEFAULT_SETTINGS: QuizSettings = {
  mode: 'single-note',
  difficulty: 'beginner',
  questionCount: 10,
  singleNoteRanges: ['C4-B4'],
  intervalAnswerMode: 'quality',
  triadAnswerMode: 'quality',
  playOnAnswerSelect: false,
}

export const SINGLE_NOTE_RANGES: { id: SingleNoteRange; label: string; min: number; max: number }[] = [
  { id: 'C2-B2', label: 'C2–B2', min: 36, max: 48 },
  { id: 'C3-B3', label: 'C3–B3', min: 48, max: 60 },
  { id: 'C4-B4', label: 'C4–B4', min: 60, max: 72 },
  { id: 'C5-B5', label: 'C5–B5', min: 72, max: 84 },
  { id: 'C6-B6', label: 'C6–B6', min: 84, max: 96 },
]

export const MODES: { id: QuestionMode; label: string; description: string; icon: string }[] = [
  { id: 'single-note', label: '單音辨認', description: '聽音辨認音名', icon: '♪' },
  { id: 'interval', label: '音程辨認', description: '聽音程或辨認兩個音', icon: '♫' },
  { id: 'triad', label: '三和弦辨認', description: '聽和弦性質或組成音', icon: '♬' },
]

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'beginner', label: '初學' },
  { id: 'intermediate', label: '中階' },
  { id: 'advanced', label: '進階' },
]

export const QUESTION_COUNTS = [5, 10, 15, 20]

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const INTERVALS = [
  '小二度', '大二度', '小三度', '大三度', '完全四度', '增四／減五度',
  '完全五度', '小六度', '大六度', '小七度', '大七度', '完全八度',
]
const INTERVAL_SEMITONES: Record<Difficulty, number[]> = {
  beginner: [2, 3, 4, 5, 7, 12],
  intermediate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
  advanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}
const TRIADS = [
  { label: '大三和弦', intervals: [0, 4, 7] },
  { label: '小三和弦', intervals: [0, 3, 7] },
  { label: '減三和弦', intervals: [0, 3, 6] },
  { label: '增三和弦', intervals: [0, 4, 8] },
]

function randomInt(min: number, maxExclusive: number): number {
  return Math.floor(Math.random() * (maxExclusive - min)) + min
}

function getPitchRange(difficulty: Difficulty): [number, number] {
  if (difficulty === 'beginner') return [60, 72]
  if (difficulty === 'intermediate') return [48, 84]
  return [36, 96]
}

function getOctaveRangeMidi(midi: number): number[] {
  const octaveStart = Math.floor(midi / 12) * 12
  return Array.from({ length: 12 }, (_, index) => octaveStart + index)
}

function noteOptionsFor(question: Question): string[] {
  const [low, high] = getPitchRange(question.difficulty)
  const answers = new Set(question.midi)
  const pitches = new Set(question.midi.flatMap(getOctaveRangeMidi))
  question.midi.forEach((midi) => pitches.add(midi))
  return [...pitches]
    .filter((midi) => (midi >= low && midi < high) || answers.has(midi))
    .sort((a, b) => a - b)
    .map(getNoteLabel)
}

export function getNoteName(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12]
}

export function getNoteLabel(midi: number): string {
  return `${getNoteName(midi)}${Math.floor(midi / 12) - 1}`
}

export function getNoteMidi(label: string): number | undefined {
  const match = /^(C♯|D♯|F♯|G♯|A♯|C|D|E|F|G|A|B)(-?\d+)$/.exec(label)
  if (!match) return undefined
  const pitchClass = NOTE_NAMES.indexOf(match[1])
  return (Number(match[2]) + 1) * 12 + pitchClass
}

export function getModeLabel(mode: QuestionMode): string {
  return MODES.find((item) => item.id === mode)?.label ?? '聽力練習'
}

export function getDifficultyLabel(difficulty: Difficulty, mode: QuestionMode): string {
  const label = DIFFICULTIES.find((item) => item.id === difficulty)?.label ?? '初學'
  if (mode !== 'interval') return label
  const intervalCount = INTERVAL_SEMITONES[difficulty].length
  return `${label}（${intervalCount} 種音程）`
}

export function getAnswerModeLabel(
  mode: QuestionMode,
  answerMode: Question['answerMode'] | undefined,
): string {
  if (mode === 'single-note') return '音名'
  if (mode === 'interval') return answerMode === 'notes' ? '兩音音名' : '音程名稱'
  if (answerMode === 'notes') return '和弦音'
  if (answerMode === 'root') return '根音'
  return '和弦性質'
}

export function isAnswerCorrect(selected: string[], correct: string[]): boolean {
  return selected.length === correct.length
    && selected.every((answer) => correct.includes(answer))
}

export function getAnswerOptions(question: Question, settings: QuizSettings): string[] {
  if (question.mode === 'single-note') return NOTE_NAMES
  if (question.mode === 'interval') {
    return question.answerMode === 'notes'
      ? noteOptionsFor(question)
      : INTERVAL_SEMITONES[settings.difficulty].map((semitones) => INTERVALS[semitones - 1])
  }
  if (question.answerMode === 'notes' || question.answerMode === 'root') {
    return noteOptionsFor(question)
  }
  return TRIADS.map((triad) => triad.label)
}

export function getOptionAudioQuestion(question: Question, option: string): Question | undefined {
  if (question.mode === 'single-note') {
    const pitchClass = NOTE_NAMES.indexOf(option)
    const targetMidi = question.midi[0]
    if (pitchClass < 0) return undefined
    const sameOctaveMidi = Math.floor(targetMidi / 12) * 12 + pitchClass
    const midi = [sameOctaveMidi - 12, sameOctaveMidi, sameOctaveMidi + 12]
      .filter((candidate) => candidate >= 0)
      .sort((a, b) => Math.abs(a - targetMidi) - Math.abs(b - targetMidi))[0]
    return midi === undefined ? undefined : { ...question, midi: [midi] }
  }

  if (question.mode === 'interval') {
    if (question.answerMode === 'notes') {
      const midi = getNoteMidi(option)
      return midi === undefined ? undefined : { ...question, midi: [midi], mode: 'single-note' }
    }
    const semitones = INTERVALS.indexOf(option) + 1
    return semitones < 1 ? undefined : { ...question, midi: [question.midi[0], question.midi[0] + semitones] }
  }

  if (question.answerMode === 'quality') {
    const triad = TRIADS.find((item) => item.label === option)
    return triad
      ? { ...question, midi: triad.intervals.map((semitones) => question.midi[0] + semitones) }
      : undefined
  }

  const midi = getNoteMidi(option)
  return midi === undefined ? undefined : { ...question, midi: [midi], mode: 'single-note' }
}

export function createQuestion(settings: QuizSettings): Question {
  if (settings.mode === 'single-note') {
    const ranges = settings.singleNoteRanges.length > 0
      ? SINGLE_NOTE_RANGES.filter((range) => settings.singleNoteRanges.includes(range.id))
      : SINGLE_NOTE_RANGES.filter((range) => range.id === DEFAULT_SETTINGS.singleNoteRanges[0])
    const selectedRange = ranges[randomInt(0, ranges.length)]
    const midi = randomInt(selectedRange.min, selectedRange.max)
    return {
      mode: settings.mode,
      prompt: '你聽到的是哪個音？',
      answers: [getNoteName(midi)],
      midi: [midi],
      answerMode: 'pitch',
      difficulty: settings.difficulty,
    }
  }

  const [low, high] = getPitchRange(settings.difficulty)
  if (settings.mode === 'interval') {
    const answerMode = settings.intervalAnswerMode
    const semitones = INTERVAL_SEMITONES[settings.difficulty][
      randomInt(0, INTERVAL_SEMITONES[settings.difficulty].length)
    ]
    const root = randomInt(low, high - semitones + 1)
    const midi = [root, root + semitones]
    return {
      mode: settings.mode,
      prompt: answerMode === 'notes' ? '這兩個音分別是什麼音？' : '這兩個音之間是什麼音程？',
      answers: answerMode === 'notes'
        ? midi.map(getNoteLabel)
        : [INTERVALS[semitones - 1]],
      midi,
      answerMode,
      difficulty: settings.difficulty,
    }
  }

  const triad = TRIADS[randomInt(0, TRIADS.length)]
  const largestInterval = Math.max(...triad.intervals)
  const root = randomInt(low, high - largestInterval + 1)
  const midi = triad.intervals.map((semitones) => root + semitones)
  const answerMode = settings.triadAnswerMode
  return {
    mode: settings.mode,
    prompt: answerMode === 'root'
      ? '這個和弦的根音是什麼音？'
      : answerMode === 'notes'
        ? '這個和弦由哪些音組成？'
        : '這個和弦屬於哪一種類型？',
    answers: answerMode === 'root'
      ? [getNoteLabel(root)]
      : answerMode === 'notes'
        ? midi.map(getNoteLabel)
        : [triad.label],
    midi,
    answerMode,
    difficulty: settings.difficulty,
  }
}
