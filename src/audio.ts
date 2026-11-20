import { now, PolySynth, start, Synth } from 'tone'
import type { Question } from './quiz'

let synth: PolySynth | undefined

function midiToToneNote(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return `${notes[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export async function playQuestion(question: Question): Promise<void> {
  await start()
  synth ??= new PolySynth(Synth).toDestination()
  const startAt = now() + 0.05

  if (question.mode === 'interval') {
    question.midi.forEach((midi, index) => {
      synth?.triggerAttackRelease(midiToToneNote(midi), 0.55, startAt + index * 0.8)
    })
    return
  }

  const notes = question.midi.map(midiToToneNote)
  synth.triggerAttackRelease(notes, question.mode === 'triad' ? 1.2 : 0.8, startAt)
}
