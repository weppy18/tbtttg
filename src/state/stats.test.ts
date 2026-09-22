import { describe, expect, it } from 'vitest';
import { CLASSIC_RULES, createGame, replay } from '../engine/index.ts';
import { DEFAULT_CONFIG } from './match.ts';
import { EMPTY_TALLY, games, parseStats, recordGame, recordResult, statsKey } from './stats.ts';

const X_WINS = replay(CLASSIC_RULES, [0, 3, 1, 4, 2]);
const O_WINS = replay(CLASSIC_RULES, [1, 0, 2, 3, 4, 6]);
const DRAW = replay(CLASSIC_RULES, [0, 1, 2, 4, 3, 5, 7, 6, 8]);

describe('recordResult', () => {
  it('counts wins, draws and streaks', () => {
    let t = recordResult(EMPTY_TALLY, X_WINS);
    expect(t.x).toBe(1);
    expect(t.streakPlayer).toBe('X');
    expect(t.streak).toBe(1);
    t = recordResult(t, X_WINS);
    expect(t.streak).toBe(2);
    expect(t.bestStreak.X).toBe(2);
    t = recordResult(t, O_WINS);
    expect(t.o).toBe(1);
    expect(t.streakPlayer).toBe('O');
    expect(t.streak).toBe(1);
    expect(t.bestStreak).toEqual({ X: 2, O: 1 });
    t = recordResult(t, DRAW);
    expect(t.draws).toBe(1);
    expect(t.streak).toBe(0);
    expect(t.streakPlayer).toBeNull();
    expect(games(t)).toBe(4);
  });

  it('ignores unfinished games', () => {
    expect(recordResult(EMPTY_TALLY, createGame())).toBe(EMPTY_TALLY);
  });
});

describe('statsKey', () => {
  it('buckets by mode', () => {
    expect(statsKey({ ...DEFAULT_CONFIG, mode: 'hvh' })).toBe('classic|hvh');
    expect(statsKey({ ...DEFAULT_CONFIG, mode: 'hva', difficulty: 'hard', humanSide: 'O' })).toBe(
      'classic|hva|hard|O',
    );
    expect(
      statsKey({ ...DEFAULT_CONFIG, mode: 'ava', difficulty: 'easy', difficultyO: 'hard' }),
    ).toBe('classic|ava|easy|hard');
  });
});

describe('recordGame / parseStats', () => {
  it('records into the right bucket', () => {
    const s = recordGame({}, DEFAULT_CONFIG, X_WINS);
    expect(s[statsKey(DEFAULT_CONFIG)]?.x).toBe(1);
    const s2 = recordGame(s, DEFAULT_CONFIG, DRAW);
    expect(s2[statsKey(DEFAULT_CONFIG)]?.draws).toBe(1);
  });

  it('parses and sanitises persisted stats', () => {
    expect(parseStats(null)).toBeNull();
    expect(parseStats([])).toBeNull();
    const parsed = parseStats({
      good: { x: 2, o: 1.9, draws: -3, streakPlayer: 'X', streak: 2, bestStreak: { X: 2, O: 'a' } },
      bad: 'nope',
      partial: {},
    });
    expect(parsed).toEqual({
      good: { x: 2, o: 1, draws: 0, streakPlayer: 'X', streak: 2, bestStreak: { X: 2, O: 0 } },
      partial: EMPTY_TALLY,
    });
  });
});
