import { DEFAULT_SETTINGS, QUESTION_COUNTS, SINGLE_NOTE_RANGES } from './quiz'
import type {
  Difficulty,
  IntervalAnswerMode,
  PracticeResult,
  QuestionMode,
  QuizSettings,
  SingleNoteRange,
  TriadAnswerMode,
  WrongAnswer,
} from './quiz'

const STORAGE_KEY = 'ear-challenge:v1'
const MODES: QuestionMode[] = ['single-note', 'interval', 'triad']
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']
const INTERVAL_ANSWER_MODES: IntervalAnswerMode[] = ['quality', 'notes']
const TRIAD_ANSWER_MODES: TriadAnswerMode[] = ['quality', 'notes', 'root']

type SavedData = {
  settings: QuizSettings
  history: PracticeResult[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isWrongAnswer(value: unknown): value is WrongAnswer {
  return isRecord(value)
    && typeof value.prompt === 'string'
    && typeof value.correctAnswer === 'string'
    && typeof value.selectedAnswer === 'string'
}

function isPracticeResult(value: unknown): value is PracticeResult {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.completedAt === 'string'
    && MODES.includes(value.mode as QuestionMode)
    && DIFFICULTIES.includes(value.difficulty as Difficulty)
    && typeof value.correct === 'number'
    && typeof value.total === 'number'
    && (value.answerMode === undefined
      || ['quality', 'notes', 'root', 'pitch'].includes(value.answerMode as string))
    && Array.isArray(value.wrongAnswers)
    && value.wrongAnswers.every(isWrongAnswer)
}

function readSettings(value: unknown): QuizSettings {
  if (!isRecord(value)) return DEFAULT_SETTINGS
  const mode = MODES.includes(value.mode as QuestionMode)
    ? value.mode as QuestionMode
    : DEFAULT_SETTINGS.mode
  const difficulty = DIFFICULTIES.includes(value.difficulty as Difficulty)
    ? value.difficulty as Difficulty
    : DEFAULT_SETTINGS.difficulty
  const questionCount = QUESTION_COUNTS.includes(value.questionCount as number)
    ? value.questionCount as number
    : DEFAULT_SETTINGS.questionCount
  const singleNoteRanges = Array.isArray(value.singleNoteRanges)
    ? value.singleNoteRanges.filter((range): range is SingleNoteRange =>
      SINGLE_NOTE_RANGES.some((allowed) => allowed.id === range),
    )
    : DEFAULT_SETTINGS.singleNoteRanges
  const intervalAnswerMode = INTERVAL_ANSWER_MODES.includes(value.intervalAnswerMode as IntervalAnswerMode)
    ? value.intervalAnswerMode as IntervalAnswerMode
    : DEFAULT_SETTINGS.intervalAnswerMode
  const triadAnswerMode = TRIAD_ANSWER_MODES.includes(value.triadAnswerMode as TriadAnswerMode)
    ? value.triadAnswerMode as TriadAnswerMode
    : DEFAULT_SETTINGS.triadAnswerMode
  const playOnAnswerSelect = typeof value.playOnAnswerSelect === 'boolean'
    ? value.playOnAnswerSelect
    : DEFAULT_SETTINGS.playOnAnswerSelect
  return {
    mode,
    difficulty,
    questionCount,
    singleNoteRanges: singleNoteRanges.length > 0 ? singleNoteRanges : DEFAULT_SETTINGS.singleNoteRanges,
    intervalAnswerMode,
    triadAnswerMode,
    playOnAnswerSelect,
  }
}

export function loadSavedData(): SavedData & { notice: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { settings: DEFAULT_SETTINGS, history: [], notice: '' }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) throw new Error('資料格式不正確')

    const history = Array.isArray(parsed.history)
      ? parsed.history.filter(isPracticeResult).slice(0, 10)
      : []
    return {
      settings: readSettings(parsed.settings),
      history,
      notice: '',
    }
  } catch (error) {
    return {
      settings: DEFAULT_SETTINGS,
      history: [],
      notice: error instanceof Error
        ? `無法讀取本機練習紀錄：${error.message}`
        : '無法讀取本機練習紀錄。',
    }
  }
}

export function saveSavedData(data: SavedData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: data.settings,
    history: data.history.slice(0, 10),
  }))
}
