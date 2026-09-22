import type {
  Difficulty,
  GameAnalysis,
  MoveEval,
  SearchOptions,
  VariantId,
} from '../engine/index.ts';
import type { AiRequest, AiResponse } from '../workers/aiProtocol.ts';
import { runAiRequest } from './aiRunner.ts';

/**
 * Runs AI searches off the main thread so deep searches on big boards never
 * drop a frame. Falls back to synchronous evaluation where Workers are
 * unavailable (tests, ancient browsers). Stale responses (after cancel) are ignored.
 */
interface Pending {
  request: AiRequest;
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
        // Worker died: answer everything in flight on the main thread and stay there.
        worker?.terminate();
        worker = null;
        for (const [, p] of pending) p.resolve(runAiRequest(p.request));
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
  if (!w) return Promise.resolve(runAiRequest(req));
  return new Promise((resolve) => {
    pending.set(req.id, { request: req, resolve });
    w.postMessage(req);
  });
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
    r.kind === 'move' ? r.index : -1,
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
    r.kind === 'evaluate' ? r.evals : [],
  );
  return cancellable(id, p);
}

export function requestAnalysis(
  variant: VariantId,
  moves: readonly number[],
): Cancellable<GameAnalysis | null> {
  const id = nextId++;
  const p = send({ id, kind: 'analyse', variant, moves }).then((r) =>
    r.kind === 'analyse' ? r.analysis : null,
  );
  return cancellable(id, p);
}
