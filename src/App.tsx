import { useState } from 'react'
import { playQuestion } from './audio'
import {
  DIFFICULTIES,
  MODES,
  QUESTION_COUNTS,
  SINGLE_NOTE_RANGES,
  createQuestion,
  getAnswerModeLabel,
  getAnswerOptions,
  getDifficultyLabel,
  getModeLabel,
  getOptionAudioQuestion,
  isAnswerCorrect,
  type Difficulty,
  type PracticeResult,
  type Question,
  type QuizSettings,
} from './quiz'
import { loadSavedData, saveSavedData } from './storage'
import './App.css'

type Phase = 'setup' | 'practice' | 'results'

type Response = {
  prompt: string
  correctAnswer: string
  selectedAnswer: string
  correct: boolean
}

function App() {
  const [savedData] = useState(loadSavedData)
  const [settings, setSettings] = useState<QuizSettings>(savedData.settings)
  const [history, setHistory] = useState<PracticeResult[]>(savedData.history)
  const [notice, setNotice] = useState(savedData.notice)
  const [phase, setPhase] = useState<Phase>('setup')
  const [question, setQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [response, setResponse] = useState<Response | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [result, setResult] = useState<PracticeResult | null>(null)
  const [audioBusy, setAudioBusy] = useState(false)

  function persistData(nextSettings: QuizSettings, nextHistory: PracticeResult[]) {
    try {
      saveSavedData({ settings: nextSettings, history: nextHistory })
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `本機資料儲存失敗：${error.message}`
          : '本機資料儲存失敗，請檢查瀏覽器儲存空間。',
      )
    }
  }

  function updateSettings(update: Partial<QuizSettings>) {
    const nextSettings = { ...settings, ...update }
    setSettings(nextSettings)
    persistData(nextSettings, history)
  }

  async function replay(nextQuestion = question) {
    if (!nextQuestion || audioBusy) return
    setAudioBusy(true)
    try {
      await playQuestion(nextQuestion)
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `音訊播放失敗：${error.message}`
          : '音訊播放失敗，請確認瀏覽器允許播放聲音。',
      )
    } finally {
      setAudioBusy(false)
    }
  }

  async function playOption(questionToPlay: Question, option: string) {
    const optionQuestion = getOptionAudioQuestion(questionToPlay, option)
    if (optionQuestion) await replay(optionQuestion)
  }

  async function startRound() {
    if (audioBusy) return
    const firstQuestion = createQuestion(settings)
    setQuestion(firstQuestion)
    setQuestionNumber(0)
    setSelectedAnswers([])
    setResponse(null)
    setResponses([])
    setResult(null)
    setPhase('practice')
    await replay(firstQuestion)
  }

  function chooseAnswer(answer: string) {
    if (!question || response) return
    const alreadySelected = selectedAnswers.includes(answer)
    if (!alreadySelected && question.answers.length > 1 && selectedAnswers.length >= question.answers.length) return
    const nextAnswers = question.answers.length === 1
      ? [answer]
      : alreadySelected
        ? selectedAnswers.filter((item) => item !== answer)
        : [...selectedAnswers, answer]
    setSelectedAnswers(nextAnswers)
    if (settings.playOnAnswerSelect) void playOption(question, answer)
  }

  function submitAnswer() {
    if (!question || selectedAnswers.length !== question.answers.length || response) return
    const nextResponse: Response = {
      prompt: question.prompt,
      correctAnswer: question.answers.join('、'),
      selectedAnswer: selectedAnswers.join('、'),
      correct: isAnswerCorrect(selectedAnswers, question.answers),
    }
    setResponse(nextResponse)
    setResponses((current) => [...current, nextResponse])
  }

  function finishRound(finalResponses: Response[], answerMode: Question['answerMode']) {
    const correct = finalResponses.filter((item) => item.correct).length
    const summary: PracticeResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completedAt: new Date().toISOString(),
      mode: settings.mode,
      answerMode,
      difficulty: settings.difficulty,
      correct,
      total: finalResponses.length,
      wrongAnswers: finalResponses.filter((item) => !item.correct),
    }
    setResult(summary)
    const nextHistory = [summary, ...history].slice(0, 10)
    setHistory(nextHistory)
    persistData(settings, nextHistory)
    setPhase('results')
  }

  function goToNextQuestion() {
    if (!question || !response) return
    const finalResponses = responses
    if (questionNumber + 1 >= settings.questionCount) {
      finishRound(finalResponses, question.answerMode)
      return
    }

    const nextQuestion = createQuestion(settings)
    setQuestion(nextQuestion)
    setQuestionNumber((current) => current + 1)
    setSelectedAnswers([])
    setResponse(null)
    void replay(nextQuestion)
  }

  function restartRound() {
    void startRound()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => setPhase('setup')}
          aria-label="回到首頁"
        >
          <span className="brand-mark" aria-hidden="true">♪</span>
          <span>耳朵練習室</span>
        </button>
        <span className="topbar-note">每天一點點，聽見更多</span>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="關閉通知">×</button>
        </div>
      )}

      {phase === 'setup' && (
        <section className="setup-screen">
          <div className="intro">
            <p className="eyebrow">LISTEN · LEARN · REPEAT</p>
            <h1>讓耳朵成為<br /><span>你的樂器。</span></h1>
            <p className="intro-copy">用幾分鐘練習音高、音程與和弦，慢慢建立你的音樂直覺。</p>
            <div className="sound-art" aria-hidden="true">
              <span className="art-note note-one">♪</span>
              <span className="art-note note-two">♫</span>
              <span className="art-orbit orbit-one" />
              <span className="art-orbit orbit-two" />
              <span className="art-center">耳</span>
            </div>
          </div>

          <div className="setup-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">你的練習</p>
                <h2>準備開始了嗎？</h2>
              </div>
              <span className="step-badge">01 / 01</span>
            </div>

            <fieldset className="setting-group">
              <legend>選擇題型</legend>
              <div className="mode-options">
                {MODES.map((mode) => (
                  <button
                    className={`mode-option ${settings.mode === mode.id ? 'selected' : ''}`}
                    type="button"
                    key={mode.id}
                    aria-pressed={settings.mode === mode.id}
                    onClick={() => updateSettings({ mode: mode.id })}
                  >
                    <span className="mode-icon" aria-hidden="true">{mode.icon}</span>
                    <span className="mode-text">
                      <strong>{mode.label}</strong>
                      <small>{mode.description}</small>
                    </span>
                    <span className="radio-dot" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={`select-row ${settings.mode === 'single-note' ? 'single-select-row' : ''}`}>
              {settings.mode !== 'single-note' && (
                <label className="setting-group select-group">
                  <span>難度</span>
                  <select
                    value={settings.difficulty}
                    onChange={(event) => updateSettings({ difficulty: event.target.value as Difficulty })}
                  >
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty.id} value={difficulty.id}>
                        {getDifficultyLabel(difficulty.id, settings.mode)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="setting-group select-group">
                <span>每回合題數</span>
                <select
                  value={settings.questionCount}
                  onChange={(event) => updateSettings({ questionCount: Number(event.target.value) })}
                >
                  {QUESTION_COUNTS.map((count) => (
                    <option key={count} value={count}>{count} 題</option>
                  ))}
                </select>
              </label>
            </div>

            {settings.mode === 'single-note' && (
              <fieldset className="setting-group range-group">
                <legend>練習音域（可複選）</legend>
                <div className="range-options">
                  {SINGLE_NOTE_RANGES.map((range) => (
                    <label className="range-option" key={range.id}>
                      <input
                        type="checkbox"
                        checked={settings.singleNoteRanges.includes(range.id)}
                        disabled={settings.singleNoteRanges.length === 1 && settings.singleNoteRanges.includes(range.id)}
                        onChange={(event) => {
                          const nextRanges = event.target.checked
                            ? [...settings.singleNoteRanges, range.id]
                            : settings.singleNoteRanges.filter((item) => item !== range.id)
                          updateSettings({ singleNoteRanges: nextRanges })
                        }}
                      />
                      <span>{range.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {settings.mode !== 'single-note' && (
              <fieldset className="setting-group answer-mode-group">
                <legend>作答內容</legend>
                <div className="answer-mode-options">
                  {(settings.mode === 'interval'
                    ? [
                      { id: 'quality', label: '音程名稱（單選）' },
                      { id: 'notes', label: '兩音音名（多選）' },
                    ]
                    : [
                      { id: 'quality', label: '和弦性質（單選）' },
                      { id: 'notes', label: '和弦音（多選）' },
                      { id: 'root', label: '只答根音（單選）' },
                    ]
                  ).map((answerMode) => {
                    const selected = settings.mode === 'interval'
                      ? settings.intervalAnswerMode === answerMode.id
                      : settings.triadAnswerMode === answerMode.id
                    return (
                      <button
                        className={`answer-mode-option ${selected ? 'selected' : ''}`}
                        type="button"
                        key={answerMode.id}
                        aria-pressed={selected}
                        onClick={() => settings.mode === 'interval'
                          ? updateSettings({ intervalAnswerMode: answerMode.id as 'quality' | 'notes' })
                          : updateSettings({ triadAnswerMode: answerMode.id as 'quality' | 'notes' | 'root' })}
                      >
                        {answerMode.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            <label className="audio-option">
              <input
                type="checkbox"
                checked={settings.playOnAnswerSelect}
                onChange={(event) => updateSettings({ playOnAnswerSelect: event.target.checked })}
              />
              <span className="audio-option-copy">
                <strong>點選答案時試聽</strong>
                <small>只播放被點選的單一音或該選項代表的音程／和弦</small>
              </span>
            </label>

            <button className="primary-button start-button" type="button" onClick={() => void startRound()} disabled={audioBusy}>
              開始練習 <span aria-hidden="true">→</span>
            </button>
            <p className="privacy-note"><span aria-hidden="true">◉</span> 不需帳號，練習紀錄只儲存在這台裝置</p>
          </div>

          <RecentPractice history={history} />
        </section>
      )}

      {phase === 'practice' && question && (
        <section className="practice-screen">
          <div className="practice-heading">
            <button className="text-button" type="button" onClick={() => setPhase('setup')}>← 結束練習</button>
            <span className="practice-mode">
              {getModeLabel(settings.mode)} · {getAnswerModeLabel(settings.mode, question.answerMode)}
            </span>
          </div>
          <div className="progress-meta">
            <span>第 {questionNumber + 1} 題 <span className="muted">/ {settings.questionCount}</span></span>
            <span>答對 <strong>{responses.filter((item) => item.correct).length}</strong> 題</span>
          </div>
          <div className="progress-track" aria-label={`進度 ${questionNumber + 1} / ${settings.questionCount}`}>
            <span style={{ width: `${((questionNumber + 1) / settings.questionCount) * 100}%` }} />
          </div>

          <div className="question-card">
            <div className="question-visual" aria-hidden="true">
              <span className="sound-wave wave-left"><i /><i /><i /><i /><i /></span>
              <button
                className={`play-button ${audioBusy ? 'playing' : ''}`}
                type="button"
                onClick={() => void replay()}
                disabled={audioBusy}
                aria-label="重播題目"
              >
                {audioBusy ? <span className="spinner" /> : <span className="play-triangle" />}
              </button>
              <span className="sound-wave wave-right"><i /><i /><i /><i /><i /></span>
            </div>
            <p className="eyebrow question-eyebrow">LISTEN CAREFULLY</p>
            <h1>{question.prompt}</h1>
            <p className="question-hint">點擊播放按鈕，可以再次聆聽</p>

            <div className="answer-grid">
              {getAnswerOptions(question, settings).map((answer) => (
                <button
                className={`answer-option ${selectedAnswers.includes(answer) ? 'chosen' : ''} ${
                  response && question.answers.includes(answer) ? 'correct-answer' : ''
                } ${response && selectedAnswers.includes(answer) && !response.correct ? 'wrong-answer' : ''}`}
                  type="button"
                  key={answer}
                onClick={() => chooseAnswer(answer)}
                  disabled={Boolean(response)}
                aria-pressed={selectedAnswers.includes(answer)}
                >
                  {answer}
                </button>
              ))}
            </div>
            {question.answers.length > 1 && !response && (
              <p className="selection-hint">請選擇 {question.answers.length} 個音名（已選 {selectedAnswers.length} 個）</p>
            )}

            {response ? (
              <div className={`feedback ${response.correct ? 'feedback-correct' : 'feedback-wrong'}`} role="status">
                <span className="feedback-icon" aria-hidden="true">{response.correct ? '✓' : '!'}</span>
                <span>{response.correct ? '答對了！' : `再接再厲，正確答案是 ${question.answers.join('、')}`}</span>
              </div>
            ) : (
              <button className="primary-button submit-button" type="button" onClick={submitAnswer} disabled={selectedAnswers.length !== question.answers.length}>
                確認答案 <span aria-hidden="true">→</span>
              </button>
            )}

            {response && (
              <button className="primary-button submit-button" type="button" onClick={goToNextQuestion}>
                {questionNumber + 1 === settings.questionCount ? '查看本回合成績' : '下一題'}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </section>
      )}

      {phase === 'results' && result && (
        <section className="results-screen">
          <p className="eyebrow">ROUND COMPLETE</p>
          <div className="result-mark" aria-hidden="true">{result.correct === result.total ? '✦' : '♪'}</div>
          <h1>{result.correct === result.total ? '太棒了，全部答對！' : '練習讓耳朵更敏銳'}</h1>
          <p className="result-subtitle">
            {getModeLabel(result.mode)} · {getAnswerModeLabel(result.mode, result.answerMode)} · {getDifficultyLabel(result.difficulty, result.mode)} · {result.total} 題
          </p>
          <div className="score-card">
            <div className="score-number">{result.correct}<span> / {result.total}</span></div>
            <p>答對題數</p>
            <div className="score-track"><span style={{ width: `${Math.round((result.correct / result.total) * 100)}%` }} /></div>
            <strong>正確率 {Math.round((result.correct / result.total) * 100)}%</strong>
          </div>
          {result.wrongAnswers.length > 0 && (
            <div className="review-card">
              <h2>錯題回顧 <span>{result.wrongAnswers.length}</span></h2>
              {result.wrongAnswers.map((item, index) => (
                <div className="review-item" key={`${item.prompt}-${index}`}>
                  <div><strong>{item.prompt}</strong><small>你的答案：{item.selectedAnswer}</small></div>
                  <span>{item.correctAnswer}</span>
                </div>
              ))}
            </div>
          )}
          <div className="result-actions">
            <button className="primary-button" type="button" onClick={restartRound}>再練習一次 <span aria-hidden="true">↻</span></button>
            <button className="secondary-button" type="button" onClick={() => setPhase('setup')}>調整設定</button>
          </div>
        </section>
      )}

      <footer className="footer">
        <span>耳朵練習室 <span className="footer-dot">·</span> 用心聆聽每一個音</span>
        <span>練習紀錄保存在你的裝置</span>
      </footer>
    </main>
  )
}

function RecentPractice({ history }: { history: PracticeResult[] }) {
  if (history.length === 0) {
    return (
      <div className="recent-practice empty-history">
        <div className="history-icon" aria-hidden="true">◷</div>
        <div><strong>你的練習旅程，從現在開始</strong><span>完成第一回合後，最近紀錄會出現在這裡。</span></div>
      </div>
    )
  }

  return (
    <div className="recent-practice">
      <div className="recent-heading"><h2>最近練習</h2><span>僅顯示最近 10 筆</span></div>
      <div className="history-list">
        {history.slice(0, 3).map((item) => (
          <div className="history-row" key={item.id}>
            <div className="history-icon" aria-hidden="true">♪</div>
            <div className="history-description">
              <strong>{getModeLabel(item.mode)} · {getAnswerModeLabel(item.mode, item.answerMode)}</strong>
              <span>{new Date(item.completedAt).toLocaleDateString()} · {item.total} 題</span>
            </div>
            <strong className="history-score">{item.correct}<small>/{item.total}</small></strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
