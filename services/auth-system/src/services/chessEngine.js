"use strict";

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 10;
const SIDES = {
  RED: "red",
  BLACK: "black",
};
const GAME_STATUS = {
  ONGOING: "ongoing",
  ENDED: "ended",
};

function createPiece(side, type, index) {
  return {
    id: `${side}_${type}_${index}`,
    side,
    type,
  };
}

function createInitialBoard() {
  const board = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null)
  );

  const place = (x, y, side, type, index) => {
    board[y][x] = createPiece(side, type, index);
  };

  // Black side (top)
  place(0, 0, SIDES.BLACK, "rook", 1);
  place(1, 0, SIDES.BLACK, "horse", 1);
  place(2, 0, SIDES.BLACK, "elephant", 1);
  place(3, 0, SIDES.BLACK, "advisor", 1);
  place(4, 0, SIDES.BLACK, "general", 1);
  place(5, 0, SIDES.BLACK, "advisor", 2);
  place(6, 0, SIDES.BLACK, "elephant", 2);
  place(7, 0, SIDES.BLACK, "horse", 2);
  place(8, 0, SIDES.BLACK, "rook", 2);
  place(1, 2, SIDES.BLACK, "cannon", 1);
  place(7, 2, SIDES.BLACK, "cannon", 2);
  place(0, 3, SIDES.BLACK, "pawn", 1);
  place(2, 3, SIDES.BLACK, "pawn", 2);
  place(4, 3, SIDES.BLACK, "pawn", 3);
  place(6, 3, SIDES.BLACK, "pawn", 4);
  place(8, 3, SIDES.BLACK, "pawn", 5);

  // Red side (bottom)
  place(0, 9, SIDES.RED, "rook", 1);
  place(1, 9, SIDES.RED, "horse", 1);
  place(2, 9, SIDES.RED, "elephant", 1);
  place(3, 9, SIDES.RED, "advisor", 1);
  place(4, 9, SIDES.RED, "general", 1);
  place(5, 9, SIDES.RED, "advisor", 2);
  place(6, 9, SIDES.RED, "elephant", 2);
  place(7, 9, SIDES.RED, "horse", 2);
  place(8, 9, SIDES.RED, "rook", 2);
  place(1, 7, SIDES.RED, "cannon", 1);
  place(7, 7, SIDES.RED, "cannon", 2);
  place(0, 6, SIDES.RED, "pawn", 1);
  place(2, 6, SIDES.RED, "pawn", 2);
  place(4, 6, SIDES.RED, "pawn", 3);
  place(6, 6, SIDES.RED, "pawn", 4);
  place(8, 6, SIDES.RED, "pawn", 5);

  return board;
}

function createInitialGameState() {
  const now = new Date().toISOString();
  const turnDurationMs = 60000;
  return {
    board: createInitialBoard(),
    turn: SIDES.RED,
    status: GAME_STATUS.ONGOING,
    winner: null,
    moveCount: 0,
    startedAt: now,
    updatedAt: now,
    lastMove: null,
    history: [],
    turnDurationMs,
    turnEndsAt: new Date(Date.now() + turnDurationMs).toISOString(),
  };
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function cloneState(state) {
  return {
    ...state,
    board: cloneBoard(state.board),
    history: state.history.map((move) => ({ ...move })),
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  };
}

function inBoard(x, y) {
  return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
}

function insidePalace(side, x, y) {
  if (x < 3 || x > 5) {
    return false;
  }
  if (side === SIDES.RED) {
    return y >= 7 && y <= 9;
  }
  return y >= 0 && y <= 2;
}

function crossesRiver(side, y) {
  return side === SIDES.RED ? y <= 4 : y >= 5;
}

function findGeneral(board, side) {
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = board[y][x];
      if (piece && piece.side === side && piece.type === "general") {
        return { x, y };
      }
    }
  }
  return null;
}

function sameSide(a, b) {
  return Boolean(a && b && a.side === b.side);
}

function addStepMove(board, piece, fromX, fromY, toX, toY, moves) {
  if (!inBoard(toX, toY)) {
    return;
  }
  const target = board[toY][toX];
  if (!sameSide(piece, target)) {
    moves.push({ fromX, fromY, toX, toY });
  }
}

function countPiecesBetween(board, x, fromY, toY) {
  const minY = Math.min(fromY, toY) + 1;
  const maxY = Math.max(fromY, toY) - 1;
  let count = 0;
  for (let y = minY; y <= maxY; y += 1) {
    if (board[y][x]) {
      count += 1;
    }
  }
  return count;
}

function generalsFacing(board) {
  const red = findGeneral(board, SIDES.RED);
  const black = findGeneral(board, SIDES.BLACK);
  if (!red || !black || red.x !== black.x) {
    return false;
  }
  return countPiecesBetween(board, red.x, red.y, black.y) === 0;
}

function getPseudoMoves(board, x, y) {
  const piece = board[y][x];
  if (!piece) {
    return [];
  }
  const { side, type } = piece;
  const moves = [];

  if (type === "general") {
    const deltas = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of deltas) {
      const nx = x + dx;
      const ny = y + dy;
      if (insidePalace(side, nx, ny)) {
        addStepMove(board, piece, x, y, nx, ny, moves);
      }
    }
    return moves;
  }

  if (type === "advisor") {
    const deltas = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [dx, dy] of deltas) {
      const nx = x + dx;
      const ny = y + dy;
      if (insidePalace(side, nx, ny)) {
        addStepMove(board, piece, x, y, nx, ny, moves);
      }
    }
    return moves;
  }

  if (type === "elephant") {
    const deltas = [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ];
    for (const [dx, dy] of deltas) {
      const nx = x + dx;
      const ny = y + dy;
      const eyeX = x + dx / 2;
      const eyeY = y + dy / 2;
      if (!inBoard(nx, ny) || board[eyeY][eyeX]) {
        continue;
      }
      if (side === SIDES.RED && ny < 5) {
        continue;
      }
      if (side === SIDES.BLACK && ny > 4) {
        continue;
      }
      addStepMove(board, piece, x, y, nx, ny, moves);
    }
    return moves;
  }

  if (type === "horse") {
    const patterns = [
      { leg: [0, -1], jump: [-1, -2] },
      { leg: [0, -1], jump: [1, -2] },
      { leg: [1, 0], jump: [2, -1] },
      { leg: [1, 0], jump: [2, 1] },
      { leg: [0, 1], jump: [-1, 2] },
      { leg: [0, 1], jump: [1, 2] },
      { leg: [-1, 0], jump: [-2, -1] },
      { leg: [-1, 0], jump: [-2, 1] },
    ];
    for (const pattern of patterns) {
      const legX = x + pattern.leg[0];
      const legY = y + pattern.leg[1];
      if (!inBoard(legX, legY) || board[legY][legX]) {
        continue;
      }
      const nx = x + pattern.jump[0];
      const ny = y + pattern.jump[1];
      addStepMove(board, piece, x, y, nx, ny, moves);
    }
    return moves;
  }

  if (type === "rook" || type === "cannon") {
    const directions = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of directions) {
      let nx = x + dx;
      let ny = y + dy;
      let jumped = false;
      while (inBoard(nx, ny)) {
        const target = board[ny][nx];
        if (type === "rook") {
          if (!target) {
            moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
          } else {
            if (!sameSide(piece, target)) {
              moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
            }
            break;
          }
        } else {
          // Cannon: before jump can only move through empty cells.
          if (!jumped) {
            if (!target) {
              moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
            } else {
              jumped = true;
            }
          } else if (target) {
            if (!sameSide(piece, target)) {
              moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
            }
            break;
          }
        }
        nx += dx;
        ny += dy;
      }
    }
    return moves;
  }

  if (type === "pawn") {
    const forward = side === SIDES.RED ? -1 : 1;
    addStepMove(board, piece, x, y, x, y + forward, moves);
    if (crossesRiver(side, y)) {
      addStepMove(board, piece, x, y, x - 1, y, moves);
      addStepMove(board, piece, x, y, x + 1, y, moves);
    }
    return moves;
  }

  return moves;
}

function applyBoardMove(board, move) {
  const nextBoard = cloneBoard(board);
  const piece = nextBoard[move.fromY][move.fromX];
  const captured = nextBoard[move.toY][move.toX];
  nextBoard[move.toY][move.toX] = piece;
  nextBoard[move.fromY][move.fromX] = null;
  return { board: nextBoard, captured };
}

function getAttackMoves(board, side) {
  const attacks = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = board[y][x];
      if (!piece || piece.side !== side) {
        continue;
      }
      const pseudo = getPseudoMoves(board, x, y);
      for (const move of pseudo) {
        attacks.push(move);
      }
      if (piece.type === "general") {
        const enemyGeneral = findGeneral(
          board,
          side === SIDES.RED ? SIDES.BLACK : SIDES.RED
        );
        if (
          enemyGeneral &&
          enemyGeneral.x === x &&
          countPiecesBetween(board, x, y, enemyGeneral.y) === 0
        ) {
          attacks.push({
            fromX: x,
            fromY: y,
            toX: enemyGeneral.x,
            toY: enemyGeneral.y,
          });
        }
      }
    }
  }
  return attacks;
}

function isInCheck(board, side) {
  const general = findGeneral(board, side);
  if (!general) {
    return true;
  }
  const enemy = side === SIDES.RED ? SIDES.BLACK : SIDES.RED;
  const attacks = getAttackMoves(board, enemy);
  return attacks.some((move) => move.toX === general.x && move.toY === general.y);
}

function isLegalMove(state, move) {
  const board = state.board;
  if (
    !inBoard(move.fromX, move.fromY) ||
    !inBoard(move.toX, move.toY) ||
    (move.fromX === move.toX && move.fromY === move.toY)
  ) {
    return false;
  }
  const piece = board[move.fromY][move.fromX];
  if (!piece || piece.side !== state.turn) {
    return false;
  }

  const pseudo = getPseudoMoves(board, move.fromX, move.fromY);
  const matched = pseudo.find(
    (candidate) =>
      candidate.toX === move.toX &&
      candidate.toY === move.toY &&
      candidate.fromX === move.fromX &&
      candidate.fromY === move.fromY
  );
  if (!matched) {
    return false;
  }

  const { board: nextBoard } = applyBoardMove(board, move);
  if (generalsFacing(nextBoard)) {
    return false;
  }
  return !isInCheck(nextBoard, piece.side);
}

function getAllLegalMoves(state, side) {
  const snapshot = side === state.turn ? state : { ...state, turn: side };
  const legalMoves = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = snapshot.board[y][x];
      if (!piece || piece.side !== side) {
        continue;
      }
      const pseudoMoves = getPseudoMoves(snapshot.board, x, y);
      for (const move of pseudoMoves) {
        if (isLegalMove(snapshot, move)) {
          legalMoves.push(move);
        }
      }
    }
  }
  return legalMoves;
}

function inferWinner(nextBoard, sideJustMoved) {
  const enemy = sideJustMoved === SIDES.RED ? SIDES.BLACK : SIDES.RED;
  const enemyGeneral = findGeneral(nextBoard, enemy);
  if (!enemyGeneral) {
    return sideJustMoved;
  }
  const mockState = {
    board: nextBoard,
    turn: enemy,
  };
  const enemyMoves = getAllLegalMoves(mockState, enemy);
  if (enemyMoves.length === 0) {
    return sideJustMoved;
  }
  return null;
}

function applyMove(state, move, actor) {
  if (state.status !== GAME_STATUS.ONGOING) {
    return { ok: false, error: "棋局已结束" };
  }
  if (!isLegalMove(state, move)) {
    return { ok: false, error: "非法走子" };
  }

  const piece = state.board[move.fromY][move.fromX];
  const { board: nextBoard, captured } = applyBoardMove(state.board, move);
  const winner = inferWinner(nextBoard, piece.side);
  const nextTurn = piece.side === SIDES.RED ? SIDES.BLACK : SIDES.RED;
  const nextStatus = winner ? GAME_STATUS.ENDED : GAME_STATUS.ONGOING;
  const now = new Date().toISOString();

  const moveRecord = {
    fromX: move.fromX,
    fromY: move.fromY,
    toX: move.toX,
    toY: move.toY,
    pieceId: piece.id,
    pieceType: piece.type,
    pieceSide: piece.side,
    captured: captured ? { ...captured } : null,
    actorUserId: actor ? actor.userId : null,
    actorUsername: actor ? actor.username : null,
    timestamp: now,
  };

  const nextState = cloneState(state);
  nextState.board = nextBoard;
  nextState.turn = nextTurn;
  nextState.status = nextStatus;
  nextState.winner = winner;
  nextState.moveCount += 1;
  nextState.updatedAt = now;
  nextState.lastMove = moveRecord;
  nextState.history.push(moveRecord);
  nextState.turnEndsAt = new Date(Date.now() + nextState.turnDurationMs).toISOString();

  const events = [];
  if (captured) {
    events.push({ type: "capture", payload: { captured } });
  }
  const enemy = piece.side === SIDES.RED ? SIDES.BLACK : SIDES.RED;
  if (isInCheck(nextBoard, enemy)) {
    events.push({
      type: "check",
      payload: { side: enemy },
    });
  }
  if (winner) {
    events.push({
      type: "game_over",
      payload: { winner },
    });
  }

  return {
    ok: true,
    state: nextState,
    moveRecord,
    events,
  };
}

module.exports = {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SIDES,
  GAME_STATUS,
  createInitialBoard,
  createInitialGameState,
  cloneState,
  isInCheck,
  isLegalMove,
  getAllLegalMoves,
  applyMove,
};
