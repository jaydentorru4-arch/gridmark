export interface HangmanPrompt {
  word: string;
  hint: string;
}

export const HANGMAN_BANK: HangmanPrompt[] = [
  { word: 'ELEPHANT', hint: 'Animal' },
  { word: 'PYRAMID', hint: 'Ancient Wonder' },
  { word: 'VOLCANO', hint: 'Nature' },
  { word: 'BACKPACK', hint: 'School Gear' },
  { word: 'GUITAR', hint: 'Instrument' },
  { word: 'ASTRONAUT', hint: 'Space' },
  { word: 'WATERFALL', hint: 'Geography' },
  { word: 'CHOCOLATE', hint: 'Dessert' },
  { word: 'DOLPHIN', hint: 'Ocean' },
  { word: 'UMBRELLA', hint: 'Rainy Day' },
  { word: 'LANTERN', hint: 'Light' },
  { word: 'COMPASS', hint: 'Navigation' },
  { word: 'PENGUIN', hint: 'Antarctica' },
  { word: 'SUBMARINE', hint: 'Deep Sea' },
  { word: 'MARATHON', hint: 'Sports' },
  { word: 'NOTEBOOK', hint: 'Stationery' },
  { word: 'DIAMOND', hint: 'Gemstone' },
  { word: 'CALENDAR', hint: 'Time' },
  { word: 'PANCAKE', hint: 'Breakfast' },
  { word: 'TREASURE', hint: 'Adventure' },
];

export const HANGMAN_MAX_WRONG = 6;

export interface HangmanState {
  phase: 'setup' | 'playing' | 'finished';
  setter: '1' | '2';
  guesser: '1' | '2';
  secretWord: string;
  hint: string;
  guessedLetters: string[];
  wrongLetters: string[];
  winner: '' | '1' | '2';
  outcomeReason: string;
}

export function createInitialHangmanState(setter: '1' | '2' = '1'): HangmanState {
  const guesser = setter === '1' ? '2' : '1';
  return {
    phase: 'setup',
    setter,
    guesser,
    secretWord: '',
    hint: '',
    guessedLetters: [],
    wrongLetters: [],
    winner: '',
    outcomeReason: '',
  };
}

export function getRandomHangmanPrompt(): HangmanPrompt {
  return HANGMAN_BANK[Math.floor(Math.random() * HANGMAN_BANK.length)];
}

export function setHangmanSecret(
  state: HangmanState,
  rawWord: string,
  rawHint: string,
): HangmanState {
  if (state.phase !== 'setup') {
    throw new Error('Secret word has already been locked in.');
  }
  const cleanWord = rawWord.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanWord.length < 3 || cleanWord.length > 14) {
    throw new Error('Secret word must be 3 to 14 letters (A–Z only).');
  }
  const cleanHint = rawHint.trim().slice(0, 40);

  return {
    ...state,
    phase: 'playing',
    secretWord: cleanWord,
    hint: cleanHint,
    guessedLetters: [],
    wrongLetters: [],
    winner: '',
    outcomeReason: '',
  };
}

export function guessHangmanLetter(
  state: HangmanState,
  rawLetter: string,
): HangmanState {
  if (state.phase !== 'playing' || state.winner !== '') {
    throw new Error('Game is not active.');
  }
  const letter = rawLetter.trim().toUpperCase();
  if (!/^[A-Z]$/.test(letter)) {
    throw new Error('Select a single letter A–Z.');
  }
  if (state.guessedLetters.includes(letter)) {
    return state;
  }

  const nextGuessed = [...state.guessedLetters, letter];
  const isHit = state.secretWord.includes(letter);
  const nextWrong = isHit ? state.wrongLetters : [...state.wrongLetters, letter];

  const allRevealed = state.secretWord
    .split('')
    .every((ch) => nextGuessed.includes(ch));

  if (allRevealed) {
    return {
      ...state,
      phase: 'finished',
      guessedLetters: nextGuessed,
      wrongLetters: nextWrong,
      winner: state.guesser,
      outcomeReason: `Guesser solved "${state.secretWord}"!`,
    };
  }

  if (nextWrong.length >= HANGMAN_MAX_WRONG) {
    return {
      ...state,
      phase: 'finished',
      guessedLetters: nextGuessed,
      wrongLetters: nextWrong,
      winner: state.setter,
      outcomeReason: `Out of guesses! The word was "${state.secretWord}".`,
    };
  }

  return {
    ...state,
    guessedLetters: nextGuessed,
    wrongLetters: nextWrong,
  };
}
