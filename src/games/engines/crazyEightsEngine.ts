export type CardSuit = 'S' | 'H' | 'D' | 'C';
export type CardRank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface PlayingCard {
  id: string; // e.g. "S-A", "H-8"
  suit: CardSuit;
  rank: CardRank;
}

export interface CrazyEightsState {
  stock: PlayingCard[];
  discard: PlayingCard[]; // top card is last element
  p1Hand: PlayingCard[];
  p2Hand: PlayingCard[];
  activeSuit: CardSuit;
  turn: '1' | '2';
  drewThisTurn: boolean;
  lastAction: string;
  winner: '' | '1' | '2';
}

const SUITS: CardSuit[] = ['S', 'H', 'D', 'C'];
const RANKS: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_NAMES: Record<CardSuit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

export function createShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export function createInitialCrazyEightsState(): CrazyEightsState {
  const deck = createShuffledDeck();
  const p1Hand = deck.slice(0, 5);
  const p2Hand = deck.slice(5, 10);
  const rest = deck.slice(10);

  // Pick a non-8 starter card for discard pile
  let starterIdx = rest.findIndex((c) => c.rank !== '8');
  if (starterIdx === -1) starterIdx = 0;
  const starter = rest[starterIdx];
  const stock = [...rest.slice(0, starterIdx), ...rest.slice(starterIdx + 1)];

  return {
    stock,
    discard: [starter],
    p1Hand,
    p2Hand,
    activeSuit: starter.suit,
    turn: '1',
    drewThisTurn: false,
    lastAction: `Opening card is ${starter.rank} of ${SUIT_NAMES[starter.suit]}.`,
    winner: '',
  };
}

export function isCardPlayable(card: PlayingCard, state: CrazyEightsState): boolean {
  const topCard = state.discard[state.discard.length - 1];
  if (!topCard) return true;
  if (card.rank === '8') return true;
  return card.suit === state.activeSuit || card.rank === topCard.rank;
}

export function playCrazyEightsCard(
  state: CrazyEightsState,
  player: '1' | '2',
  cardId: string,
  chosenSuit?: CardSuit,
): CrazyEightsState {
  if (state.winner !== '') {
    throw new Error('This match has already ended.');
  }
  if (state.turn !== player) {
    throw new Error('Wait for your turn.');
  }

  const hand = player === '1' ? [...state.p1Hand] : [...state.p2Hand];
  const cardIdx = hand.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) {
    throw new Error('Card not in your hand.');
  }
  const card = hand[cardIdx];
  if (!isCardPlayable(card, state)) {
    throw new Error('Card must match the active suit, top rank, or be a wild 8.');
  }

  const nextSuit: CardSuit = card.rank === '8' ? chosenSuit || card.suit : card.suit;
  hand.splice(cardIdx, 1);

  const nextDiscard = [...state.discard, card];
  const wonNow = hand.length === 0;
  const actionLabel =
    card.rank === '8'
      ? `Played wild 8 — suit is now ${SUIT_NAMES[nextSuit]}!`
      : `Played ${card.rank} of ${SUIT_NAMES[card.suit]}.`;

  return {
    stock: state.stock,
    discard: nextDiscard,
    p1Hand: player === '1' ? hand : state.p1Hand,
    p2Hand: player === '2' ? hand : state.p2Hand,
    activeSuit: nextSuit,
    turn: wonNow ? player : player === '1' ? '2' : '1',
    drewThisTurn: false,
    lastAction: actionLabel,
    winner: wonNow ? player : '',
  };
}

export function drawCrazyEightsCard(
  state: CrazyEightsState,
  player: '1' | '2',
): CrazyEightsState {
  if (state.winner !== '') {
    throw new Error('Match already ended.');
  }
  if (state.turn !== player) {
    throw new Error('Wait for your turn.');
  }
  if (state.drewThisTurn) {
    throw new Error('You already drew a card this turn — play a valid card or pass.');
  }

  let stock = [...state.stock];
  let discard = [...state.discard];

  if (stock.length === 0) {
    if (discard.length <= 1) {
      // No cards available anywhere — pass turn
      return {
        ...state,
        turn: player === '1' ? '2' : '1',
        drewThisTurn: false,
        lastAction: 'Deck empty — turn passed.',
      };
    }
    const top = discard[discard.length - 1];
    const recycled = discard.slice(0, -1);
    for (let i = recycled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = recycled[i];
      recycled[i] = recycled[j];
      recycled[j] = tmp;
    }
    stock = recycled;
    discard = [top];
  }

  const drawn = stock[stock.length - 1];
  const nextStock = stock.slice(0, -1);
  const nextHand =
    player === '1' ? [...state.p1Hand, drawn] : [...state.p2Hand, drawn];

  const tempState: CrazyEightsState = {
    stock: nextStock,
    discard,
    p1Hand: player === '1' ? nextHand : state.p1Hand,
    p2Hand: player === '2' ? nextHand : state.p2Hand,
    activeSuit: state.activeSuit,
    turn: player,
    drewThisTurn: true,
    lastAction: `Player ${player} drew a card.`,
    winner: '',
  };

  // If no card in hand is playable after drawing, auto-pass so flow stays snappy
  const hasPlayable = nextHand.some((c) => isCardPlayable(c, tempState));
  if (!hasPlayable) {
    return {
      ...tempState,
      turn: player === '1' ? '2' : '1',
      drewThisTurn: false,
      lastAction: `Player ${player} drew a card and passed.`,
    };
  }

  return tempState;
}

export function passCrazyEightsTurn(
  state: CrazyEightsState,
  player: '1' | '2',
): CrazyEightsState {
  if (state.winner !== '' || state.turn !== player) return state;
  return {
    ...state,
    turn: player === '1' ? '2' : '1',
    drewThisTurn: false,
    lastAction: `Player ${player} passed their turn.`,
  };
}
