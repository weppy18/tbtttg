import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  WIN,
  bestMoves,
  chooseMove,
  depthFor,
  evaluateBoard,
  evaluateMoves,
  evaluatePosition,
  outcomeOf,
  type Difficulty,
} from './ai.ts';
import { applyMove, createGame, legalMoves, replay } from './game.ts';
import { seededRng } from './random.ts';
import { CLASSIC_RULES, type GameState, type Player, type Rules } from './types.ts';

const MISERE: Rules = { size: 3, winLength: 3, misere: true };
const FOUR: Rules = { size: 4, winLength: 4, misere: false };
const FIVE: Rules = { size: 5, winLength: 4, misere: false };

/**
 * Play the AI (as `aiSide`) against EVERY possible opponent line and return
 * the number of games the AI lost. This is the "provably unbeatable" check.
 */
function countLossesAgainstAllLines(
  rules: Rules,
  aiSide: Player,
  difficulty: Difficulty,
  seed: number,
): {
  losses: number;
  games: number;
} {
  const rng = seededRng(seed);
  let losses = 0;
  let games = 0;
  const walk = (state: GameState): void => {
    if (state.status !== 'playing') {
      games++;
      if (state.status === 'won' && state.winner !== aiSide) losses++;
      return;
    }
    if (state.toMove === aiSide) {
      walk(applyMove(state, chooseMove(state, difficulty, rng)));
    } else {
      for (const m of legalMoves(state)) walk(applyMove(state, m));
    }
  };
  walk(createGame(rules));
  return { losses, games };
}

function playGame(rules: Rules, x: Difficulty, o: Difficulty, seed: number): GameState {
  const rng = seededRng(seed);
  let state = createGame(rules);
  while (state.status === 'playing') {
    state = applyMove(state, chooseMove(state, state.toMove === 'X' ? x : o, rng));
  }
  return state;
}

describe('perfect play on 3x3', () => {
  it('evaluates the empty board as a draw', () => {
    expect(outcomeOf(evaluatePosition(createGame()))).toBe('draw');
  });

  it('finds an immediate win and prefers the fastest one', () => {
    // X: 0,1 ; O: 3,4 ; X to move → 2 wins now.
    const s = replay(CLASSIC_RULES, [0, 3, 1, 4]);
    expect(bestMoves(s)).toEqual([2]);
    expect(evaluateMoves(s)[0]!.score).toBe(WIN - 1);
  });

  it('blocks an immediate threat', () => {
    // X: 0,1 ; O: 4 ; O to move must block 2.
    const s = replay(CLASSIC_RULES, [0, 4, 1]);
    expect(bestMoves(s)).toEqual([2]);
  });

  it('sees forks: after X corner + opposite corner, O must not take a corner', () => {
    // X 0, O 4, X 8: O must play an edge; a corner loses to a fork.
    const s = replay(CLASSIC_RULES, [0, 4, 8]);
    const best = bestMoves(s);
    expect(best.sort()).toEqual([1, 3, 5, 7]);
    const evals = evaluateMoves(s);
    for (const e of evals) {
      if ([2, 6].includes(e.index)) expect(outcomeOf(e.score)).toBe('loss');
      else expect(outcomeOf(e.score)).toBe('draw');
    }
  });

  it('returns nothing when the game is over', () => {
    const won = replay(CLASSIC_RULES, [0, 3, 1, 4, 2]);
    expect(evaluateMoves(won)).toEqual([]);
    expect(bestMoves(won)).toEqual([]);
    expect(evaluatePosition(won)).toBe(-WIN); // O to move, X won
    const draw = replay(CLASSIC_RULES, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(evaluatePosition(draw)).toBe(0);
    // A won state where the winner is the side "to move" (misère): +WIN.
    const misereWon = replay(MISERE, [0, 3, 1, 4, 2]);
    expect(misereWon.winner).toBe('O');
    expect(misereWon.toMove).toBe('O');
    expect(evaluatePosition(misereWon)).toBe(WIN);
  });

  it('is unbeatable as X and as O against every opponent line (classic)', () => {
    for (const seed of [1, 2, 3]) {
      const asX = countLossesAgainstAllLines(CLASSIC_RULES, 'X', 'impossible', seed);
      expect(asX.games).toBeGreaterThan(50);
      expect(asX.losses).toBe(0);
      const asO = countLossesAgainstAllLines(CLASSIC_RULES, 'O', 'impossible', seed);
      expect(asO.games).toBeGreaterThan(100);
      expect(asO.losses).toBe(0);
    }
  });

  it('is unbeatable as X in misère (misère 3x3 is a win for X: centre first)', () => {
    const asX = countLossesAgainstAllLines(MISERE, 'X', 'impossible', 7);
    expect(asX.losses).toBe(0);
    expect(outcomeOf(evaluatePosition(createGame(MISERE)))).toBe('draw');
  });

  it('in misère avoids completing a line when any alternative exists', () => {
    // X has 0,1; O has 3,4; X to move — 2 would complete a line and lose.
    const s = replay(MISERE, [0, 3, 1, 4]);
    expect(bestMoves(s)).not.toContain(2);
  });
});

describe('outcomeOf', () => {
  it('classifies scores', () => {
    expect(outcomeOf(WIN - 3)).toBe('win');
    expect(outcomeOf(-(WIN - 3))).toBe('loss');
    expect(outcomeOf(0)).toBe('draw');
    expect(outcomeOf(500)).toBe('draw');
  });
});

describe('evaluateBoard', () => {
  it('scores lines by ownership and ignores contested lines', () => {
    const s = replay(CLASSIC_RULES, [4]);
    // X owns 4 lines through the centre with one mark each: +4 for X, -4 for O.
    expect(evaluateBoard(s.board, s.rules, 'X')).toBe(4);
    expect(evaluateBoard(s.board, s.rules, 'O')).toBe(-4);
    expect(evaluateBoard(s.board, MISERE, 'X')).toBe(-4);
    const empty = createGame();
    expect(evaluateBoard(empty.board, empty.rules, 'X')).toBe(0);
  });
});

describe('difficulty levels', () => {
  it('cover every level with a search depth', () => {
    for (const d of DIFFICULTIES) {
      expect(depthFor(d, CLASSIC_RULES)).toBeGreaterThan(0);
      expect(depthFor(d, FOUR)).toBeGreaterThan(0);
      expect(depthFor(d, FIVE)).toBeGreaterThan(0);
    }
    expect(depthFor('impossible', CLASSIC_RULES)).toBe(Infinity);
    expect(depthFor('impossible', FOUR)).toBeLessThan(Infinity);
  });

  it('throws when the game is over', () => {
    const won = replay(CLASSIC_RULES, [0, 3, 1, 4, 2]);
    expect(() => chooseMove(won, 'easy')).toThrow(RangeError);
  });

  it('easy loses far more often than medium, which loses more than hard; impossible never loses', () => {
    const lossRate = (d: Difficulty) => {
      let losses = 0;
      const n = 60;
      for (let seed = 0; seed < n; seed++) {
        const asO = playGame(CLASSIC_RULES, 'impossible', d, seed);
        if (asO.winner === 'X') losses++;
        const asX = playGame(CLASSIC_RULES, d, 'impossible', seed + 1000);
        if (asX.winner === 'O') losses++;
      }
      return losses / (2 * n);
    };
    const easy = lossRate('easy');
    const medium = lossRate('medium');
    const hard = lossRate('hard');
    const impossible = lossRate('impossible');
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
    expect(hard).toBeGreaterThanOrEqual(impossible);
    expect(impossible).toBe(0);
    expect(easy).toBeGreaterThan(0.5);
  });

  it('easy and medium sometimes take the immediate win', () => {
    const s = replay(CLASSIC_RULES, [0, 3, 1, 4]);
    const rng = seededRng(42);
    const picks = new Set<number>();
    for (let i = 0; i < 40; i++) picks.add(chooseMove(s, 'easy', rng));
    expect(picks.has(2)).toBe(true);
    expect(picks.size).toBeGreaterThan(1);
    for (let i = 0; i < 10; i++) expect(chooseMove(s, 'medium', rng)).toBe(2);
  });

  it('medium blocks and easy sometimes blocks', () => {
    const s = replay(CLASSIC_RULES, [0, 4, 1]);
    const rng = seededRng(7);
    for (let i = 0; i < 10; i++) expect(chooseMove(s, 'medium', rng)).toBe(2);
    const picks = new Set<number>();
    for (let i = 0; i < 40; i++) picks.add(chooseMove(s, 'easy', rng));
    expect(picks.has(2)).toBe(true);
  });

  it('medium plays a random (non-tactical) move some of the time', () => {
    const s = replay(CLASSIC_RULES, [0, 4, 8]);
    const rng = seededRng(3);
    const picks = new Set<number>();
    for (let i = 0; i < 60; i++) picks.add(chooseMove(s, 'medium', rng));
    // Perfect play only allows edges; a random slip lands on a corner sometimes.
    expect([2, 6].some((c) => picks.has(c))).toBe(true);
  });

  it('easy in misère avoids suicidal moves when it can', () => {
    const s = replay(MISERE, [0, 3, 1, 4]);
    const rng = seededRng(9);
    for (let i = 0; i < 30; i++) expect(chooseMove(s, 'easy', rng)).not.toBe(2);
    // when every move completes a line, it must still return a legal move
    const forced = replay(MISERE, [0, 1, 2, 3, 4, 5, 7, 6]);
    expect(legalMoves(forced)).toEqual([8]);
    expect(applyMove(forced, 8).status).toBe('won');
    for (let i = 0; i < 20; i++) {
      expect(chooseMove(forced, 'easy', rng)).toBe(8);
      expect(chooseMove(forced, 'medium', rng)).toBe(8);
    }
  });

  it('plays sensibly and quickly on 4x4 and 5x5', () => {
    for (const rules of [FOUR, FIVE]) {
      for (const d of DIFFICULTIES) {
        const t0 = performance.now();
        const g = playGame(rules, d, d, 1);
        expect(g.status).not.toBe('playing');
        expect(performance.now() - t0).toBeLessThan(4000);
      }
    }
  });

  it('impossible on 4x4 takes an immediate win and blocks an immediate loss', () => {
    const win = replay(FOUR, [0, 4, 1, 5, 2, 6]);
    expect(chooseMove(win, 'impossible', seededRng(1))).toBe(3);
    const block = replay(FOUR, [0, 4, 1, 5, 2, 15, 10]);
    // O threatens 4,5,6,7; X threatens 0,1,2,3 — O to move must win at 3? No: O has 4,5,15; X has 0,1,2,10.
    // O must block 3.
    expect(chooseMove(block, 'impossible', seededRng(1))).toBe(3);
    expect(chooseMove(block, 'hard', seededRng(1))).toBe(3);
  });
});
