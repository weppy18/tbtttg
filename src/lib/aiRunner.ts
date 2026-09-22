import {
  analyseGame,
  chooseMove,
  evaluateMoves,
  replay,
  rulesFor,
  seededRng,
} from '../engine/index.ts';
import type { AiRequest, AiResponse } from '../workers/aiProtocol.ts';

/** Executes one AI request synchronously. Shared by the worker and the main-thread fallback. */
export function runAiRequest(req: AiRequest): AiResponse {
  const rules = rulesFor(req.variant);
  switch (req.kind) {
    case 'move':
      return {
        id: req.id,
        kind: 'move',
        index: chooseMove(replay(rules, req.moves), req.difficulty, seededRng(req.seed)),
      };
    case 'evaluate':
      return {
        id: req.id,
        kind: 'evaluate',
        evals: evaluateMoves(replay(rules, req.moves), req.options),
      };
    case 'analyse':
      return { id: req.id, kind: 'analyse', analysis: analyseGame(rules, req.moves) };
  }
}
