import {
  chooseMove,
  evaluateMoves,
  replay,
  rulesFor,
  seededRng,
  type Difficulty,
  type MoveEval,
  type SearchOptions,
  type VariantId,
} from '../engine/index.ts';
import type { AiRequest, AiResponse } from '../workers/aiProtocol.ts';

/**
 * Runs AI searches off the main thread so deep searches on big boards never
 * drop a frame. Falls back to synchronous evaluation where Workers are
 * unavailable (tests, ancient browsers). Stale responses (after cancel) are ignored.
 */
interface Pending {
  resolve: (r: AiResponse) => void;
}

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof Worker === 'undefined') {
      worker = null;
    } else {
      worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<AiResponse>) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        pending.delete(e.data.id);
        p.resolve(e.data);
      };
      worker.onerror = () => {
        // Worker died: fall back to sync mode for the rest of the session.
        worker?.terminate();
        worker = null;
        for (const [, p] of pending) p.resolve({ id: -1, kind: 'move', index: -1 });
        pending.clear();
      };
    }
  } catch {
    worker = null;
  }
  return worker;
}

function send(req: AiRequest): Promise<AiResponse> {
  const w = getWorker();
  if (!w) return Promise.resolve(runSync(req));
  return new Promise((resolve) => {
    pending.set(req.id, { resolve });
    w.postMessage(req);
  });
}

function runSync(req: AiRequest): AiResponse {
  const state = replay(rulesFor(req.variant), req.moves);
  if (req.kind === 'move') {
    return {
      id: req.id,
      kind: 'move',
      index: chooseMove(state, req.difficulty, seededRng(req.seed)),
    };
  }
  return { id: req.id, kind: 'evaluate', evals: evaluateMoves(state, req.options) };
}

export interface Cancellable<T> {
  promise: Promise<T>;
  cancel: () => void;
}

function cancellable<T>(id: number, promise: Promise<T>): Cancellable<T> {
  return {
    promise,
    cancel: () => {
      pending.delete(id);
    },
  };
}

export function requestMove(
  variant: VariantId,
  moves: readonly number[],
  difficulty: Difficulty,
  seed: number = Math.floor(Math.random() * 2 ** 31),
): Cancellable<number> {
  const id = nextId++;
  const p = send({ id, kind: 'move', variant, moves, difficulty, seed }).then((r) =>
    r.kind === 'move' && r.index >= 0
      ? r.index
      : chooseMove(replay(rulesFor(variant), moves), difficulty, seededRng(seed)),
  );
  return cancellable(id, p);
}

export function requestEvaluation(
  variant: VariantId,
  moves: readonly number[],
  options: SearchOptions = {},
): Cancellable<MoveEval[]> {
  const id = nextId++;
  const p = send({ id, kind: 'evaluate', variant, moves, options }).then((r) =>
    r.kind === 'evaluate' ? r.evals : evaluateMoves(replay(rulesFor(variant), moves), options),
  );
  return cancellable(id, p);
}
