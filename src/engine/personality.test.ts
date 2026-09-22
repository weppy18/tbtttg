import { describe, expect, it } from 'vitest';
import { chooseMove, evaluateMoves, outcomeOf } from './ai.ts';
import { applyMove, createGame, legalMoves, replay } from './game.ts';
import {
  PERSONALITIES,
  isPersonality,
  outcomePreservingMoves,
  pickByPersonality,
  type Personality,
} from './personality.ts';
import { seededRng } from './random.ts';
import { CLASSIC_RULES, type GameState, type Player } from './types.ts';

function countLosses(personality: Personality, aiSide: Player): number {
  const rng = seededRng(3);
  let losses = 0;
  const walk = (state: GameState): void => {
    if (state.status !== 'playing') {
      if (state.status === 'won' && state.winner !== aiSide) losses++;
      return;
    }
    if (state.toMove === aiSide) {
      walk(applyMove(state, chooseMove(state, 'impossible', rng, personality)));
    } else {
      for (const m of legalMoves(state)) walk(applyMove(state, m));
    }
  };
  walk(createGame(CLASSIC_RULES));
  return losses;
}

describe('personalities', () => {
  it('are all still unbeatable at impossible', () => {
    for (const p of PERSONALITIES) {
      expect(countLosses(p, 'X'), p).toBe(0);
      expect(countLosses(p, 'O'), p).toBe(0);
    }
  });

  it('isPersonality guards', () => {
    expect(isPersonality('trickster')).toBe(true);
    expect(isPersonality('sneaky')).toBe(false);
  });

  it('outcomePreservingMoves keeps only moves with the top outcome', () => {
    // X 0, O 4, X 8: O to move — edges draw, corners lose.
    const s = replay(CLASSIC_RULES, [0, 4, 8]);
    const kept = outcomePreservingMoves(evaluateMoves(s)).map((e) => e.index);
    expect(kept.sort()).toEqual([1, 3, 5, 7]);
    expect(outcomePreservingMoves([])).toEqual([]);
  });

  it('aggressive takes an immediate win and otherwise builds threats', () => {
    const win = replay(CLASSIC_RULES, [0, 3, 1, 4]);
    expect(pickByPersonality(win, evaluateMoves(win), 'aggressive', seededRng(1))).toBe(2);
    // From the empty board every move draws; aggressive prefers the centre (most lines).
    const empty = createGame();
    expect(pickByPersonality(empty, evaluateMoves(empty), 'aggressive', seededRng(1))).toBe(4);
  });

  it('defensive prefers moves that leave the opponent the fewest threats', () => {
    // X 4, O 0: X to move. All moves draw; a defensive X blocks O's lines through the corner.
    const s = replay(CLASSIC_RULES, [4, 0]);
    const pickd = pickByPersonality(s, evaluateMoves(s), 'defensive', seededRng(1));
    const after = applyMove(s, pickd);
    // O's open lines after the move must be minimal among draw-preserving moves.
    const threats = (g: GameState) =>
      [
        [0, 1, 2],
        [0, 3, 6],
        [0, 4, 8],
      ].filter((line) => line.every((i) => g.board[i] !== 'X')).length;
    for (const e of outcomePreservingMoves(evaluateMoves(s))) {
      expect(threats(after)).toBeLessThanOrEqual(threats(applyMove(s, e.index)));
    }
  });

  it('trickster maximises the number of losing replies for the opponent', () => {
    // X to move from an empty board: a corner leaves O with 4 losing replies... actually
    // after X corner, O's losing replies are the non-centre cells? Compute and compare.
    const empty = createGame();
    const evals = evaluateMoves(empty);
    const choice = pickByPersonality(empty, evals, 'trickster', seededRng(1));
    const losingReplies = (m: number) =>
      evaluateMoves(applyMove(empty, m)).filter((r) => outcomeOf(r.score) === 'loss').length;
    const best = Math.max(...evals.map((e) => losingReplies(e.index)));
    expect(losingReplies(choice)).toBe(best);
    expect(best).toBeGreaterThan(0);
    // A corner opening gives O the most ways to lose (5), so tricksters open in a corner.
    expect([0, 2, 6, 8]).toContain(choice);
  });

  it('throws with no candidates and takes finishing moves as trickster/defensive', () => {
    expect(() => pickByPersonality(createGame(), [], 'aggressive')).toThrow(RangeError);
    const win = replay(CLASSIC_RULES, [0, 3, 1, 4]);
    expect(pickByPersonality(win, evaluateMoves(win), 'trickster', seededRng(1))).toBe(2);
    expect(pickByPersonality(win, evaluateMoves(win), 'defensive', seededRng(1))).toBe(2);
    expect(pickByPersonality(win, evaluateMoves(win), 'balanced', seededRng(1))).toBe(2);
    // A forced drawing final move (misère-free): trickster key for a non-winning terminal is 0.
    const drawish = replay(CLASSIC_RULES, [0, 1, 2, 4, 3, 5, 7, 6]);
    expect(pickByPersonality(drawish, evaluateMoves(drawish), 'trickster', seededRng(1))).toBe(8);
  });

  it('medium and hard honour the personality on searched moves', () => {
    const empty = createGame();
    const picks = new Set<number>();
    for (let i = 0; i < 20; i++) picks.add(chooseMove(empty, 'hard', seededRng(i), 'aggressive'));
    expect(picks).toEqual(new Set([4]));
    const rng = seededRng(9);
    const corners = new Set([0, 2, 6, 8]);
    let cornerOpenings = 0;
    for (let i = 0; i < 30; i++) {
      if (corners.has(chooseMove(empty, 'medium', rng, 'trickster'))) cornerOpenings++;
    }
    expect(cornerOpenings).toBeGreaterThan(15);
  });
});
