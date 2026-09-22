import { runAiRequest } from '../lib/aiRunner.ts';
import type { AiRequest } from './aiProtocol.ts';

self.onmessage = (event: MessageEvent<AiRequest>) => {
  self.postMessage(runAiRequest(event.data));
};
