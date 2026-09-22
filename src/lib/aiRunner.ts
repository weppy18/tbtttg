import {
  analyseVariant,
  chooseVariantMove,
  evaluateVariantMoves,
  replayVariant,
  seededRng,
} from '../engine/index.ts';
import type { AiRequest, AiResponse } from '../workers/aiProtocol.ts';

/** Executes one AI request synchronously. Shared by the worker and the main-thread fallback. */
export function runAiRequest(req: AiRequest): AiResponse {
  switch (req.kind) {
    case 'move':
      return {
        id: req.id,
        kind: 'move',
        index: chooseVariantMove(
          replayVariant(req.variant, req.moves),
          req.difficulty,
          seededRng(req.seed),
        ),
      };
    case 'evaluate':
      return {
        id: req.id,
        kind: 'evaluate',
        evals: evaluateVariantMoves(replayVariant(req.variant, req.moves)),
      };
    case 'analyse':
      return { id: req.id, kind: 'analyse', analysis: analyseVariant(req.variant, req.moves) };
  }
}
