import { chooseMove, evaluateMoves, replay, rulesFor, seededRng } from '../engine/index.ts';
import type { AiRequest, AiResponse } from './aiProtocol.ts';

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const req = event.data;
  const state = replay(rulesFor(req.variant), req.moves);
  let res: AiResponse;
  if (req.kind === 'move') {
    res = {
      id: req.id,
      kind: 'move',
      index: chooseMove(state, req.difficulty, seededRng(req.seed)),
    };
  } else {
    res = { id: req.id, kind: 'evaluate', evals: evaluateMoves(state, req.options) };
  }
  self.postMessage(res);
};
