import { useState } from 'react';
import { applyMove, createGame, isLegalMove, type GameState } from './engine/index.ts';

function statusText(state: GameState): string {
  if (state.status === 'won') return `${state.winner} wins!`;
  if (state.status === 'draw') return "It's a draw.";
  return `${state.toMove} to move`;
}

export function App() {
  const [game, setGame] = useState<GameState>(() => createGame());

  const play = (index: number) => {
    if (!isLegalMove(game, index)) return;
    setGame(applyMove(game, index));
  };

  return (
    <main className="app">
      <h1>Tic-Tac-Toe</h1>
      <p className="status" role="status" aria-live="polite">
        {statusText(game)}
      </p>
      <div
        className="board"
        role="grid"
        aria-label="Tic-Tac-Toe board"
        style={{ '--size': game.rules.size } as React.CSSProperties}
      >
        {game.board.map((cell, i) => {
          const winning = game.winningLine?.includes(i) ?? false;
          return (
            <button
              key={i}
              type="button"
              className={`cell${winning ? ' cell--win' : ''}`}
              data-mark={cell ?? ''}
              onClick={() => play(i)}
              disabled={game.status !== 'playing' || cell !== null}
              aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
            >
              {cell}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn" onClick={() => setGame(createGame())}>
        Restart
      </button>
    </main>
  );
}
