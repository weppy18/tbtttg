export const en = {
  appTitle: 'Tic-Tac-Toe',
  tagline: 'The game, perfected.',

  // Modes
  'mode.hvh': 'Two players',
  'mode.hva': 'Versus AI',
  'mode.ava': 'Watch AI vs AI',
  'mode.label': 'Mode',

  // Difficulty
  'difficulty.label': 'Difficulty',
  'difficulty.easy': 'Easy',
  'difficulty.medium': 'Medium',
  'difficulty.hard': 'Hard',
  'difficulty.impossible': 'Impossible',
  'difficulty.easy.hint': 'Plays loosely. Great for kids and first games.',
  'difficulty.medium.hint': 'Blocks and wins when it can, but slips sometimes.',
  'difficulty.hard.hint': 'Sound tactics — beat it with a fork.',
  'difficulty.impossible.hint': 'Perfect play. The best you can do is draw.',
  'difficulty.x': 'X difficulty',
  'difficulty.o': 'O difficulty',

  // Side
  'side.label': 'You play',
  'side.x': 'X (first)',
  'side.o': 'O (second)',

  // Variants
  'variant.label': 'Variant',
  'variant.classic': 'Classic 3×3',
  'variant.misere': 'Misère 3×3',
  'variant.four': '4×4',
  'variant.five': '5×5',
  'variant.ultimate': 'Ultimate',
  'variant.classic.rules':
    'Get three of your marks in a row — horizontally, vertically or diagonally.',
  'variant.misere.rules':
    'Reverse tic-tac-toe: the player who completes three in a row LOSES. Avoid lines!',
  'variant.four.rules': 'A 4×4 board. Get four in a row to win.',
  'variant.five.rules': 'A 5×5 board where four in a row wins — more room for tactics.',
  'variant.ultimate.rules':
    'Nine small boards inside a big one. Your move sends your opponent to the small board matching the cell you played. Win three small boards in a row to win the game.',

  // Status
  'status.toMove': '{player} to move',
  'status.yourTurn': 'Your turn ({player})',
  'status.aiThinking': 'AI is thinking…',
  'status.win': '{player} wins!',
  'status.youWin': 'You win!',
  'status.youLose': 'AI wins.',
  'status.draw': 'Draw.',
  'status.misereWin': '{loser} completed a line — {player} wins!',

  // Board
  'board.label': '{name} board, {size} by {size}',
  'board.cell': 'Row {row}, column {col}',
  'board.cell.empty': 'empty',
  'board.cell.mark': '{mark}',
  'board.invalid': 'That cell is taken.',
  'board.gameOver': 'The game is over. Start a new game to keep playing.',
  'announce.move': '{player} played row {row}, column {col}.',
  'announce.aiMove': 'AI ({player}) played row {row}, column {col}.',
  'announce.win': '{player} wins with a line.',
  'announce.draw': 'The game is a draw.',
  'announce.newGame': 'New game. {player} to move.',
  'announce.undo': 'Move undone.',
  'announce.redo': 'Move redone.',

  // Controls
  'action.newGame': 'New game',
  'action.restart': 'Restart',
  'action.undo': 'Undo',
  'action.redo': 'Redo',
  'action.hint': 'Hint',
  'action.playAgain': 'Play again',
  'action.rematch': 'Rematch (swap sides)',
  'action.analyse': 'Analyse game',
  'action.share': 'Share',
  'action.copied': 'Link copied!',
  'action.replay': 'Replay',
  'action.settings': 'Settings',
  'action.close': 'Close',
  'action.howToPlay': 'How to play',
  'action.resetStats': 'Reset stats',
  'action.mute': 'Mute sounds',
  'action.unmute': 'Unmute sounds',

  // Theme
  'theme.label': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',

  // Language
  'language.label': 'Language',

  // Scoreboard
  'stats.title': 'Scoreboard',
  'stats.wins': 'Wins',
  'stats.losses': 'Losses',
  'stats.draws': 'Draws',
  'stats.x': 'X wins',
  'stats.o': 'O wins',
  'stats.streak': 'Streak',
  'stats.bestStreak': 'Best streak',
  'stats.games': 'Games',
  'stats.empty': 'No games yet — play one!',

  // History
  'history.title': 'Moves',
  'history.move': 'Move {n}: {player} at row {row}, column {col}',
  'history.start': 'Start',
  'history.jumpTo': 'Jump to move {n}',

  // Misc
  'offline.ready': 'Ready to play offline.',
  'update.available': 'Update available',
  'update.reload': 'Reload',
  'keyboard.help':
    'Keyboard: arrow keys to move, Enter or Space to play, 1–9 to pick a cell, U to undo.',
} as const;

export type MessageKey = keyof typeof en;
