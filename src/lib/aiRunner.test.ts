import { describe, expect, it } from 'vitest';
import { runAiRequest } from './aiRunner.ts';

describe('runAiRequest', () => {
  it('answers move, evaluate and analyse requests', () => {
    const move = runAiRequest({
      id: 1,
      kind: 'move',
      variant: 'classic',
      moves: [0, 3, 1, 4],
      difficulty: 'impossible',
      seed: 1,
    });
    expect(move).toEqual({ id: 1, kind: 'move', index: 2 });
    const ev = runAiRequest({
      id: 2,
      kind: 'evaluate',
      variant: 'classic',
      moves: [0, 3, 1, 4],
      options: {},
    });
    expect(ev.kind).toBe('evaluate');
    if (ev.kind === 'evaluate') expect(ev.evals[0]!.index).toBe(2);
    const an = runAiRequest({ id: 3, kind: 'analyse', variant: 'classic', moves: [0, 4, 8, 2] });
    expect(an.kind).toBe('analyse');
    if (an.kind === 'analyse') expect(an.analysis.moves[3]!.quality).toBe('blunder');
  });
});
