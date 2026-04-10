export function createMatrix(size, fillValue = 0) {
    return Array.from({ length: size }, () => Array(size).fill(fillValue));
}

export function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
}

export function randomInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
}

export function getEmptyCells(board) {
    const cells = [];
    for (let row = 0; row < board.length; row += 1) {
        for (let col = 0; col < board[row].length; col += 1) {
            if (board[row][col] === 0) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}

export function hasAnyMoves(board) {
    const size = board.length;
    if (getEmptyCells(board).length > 0) {
        return true;
    }

    for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
            const value = board[row][col];
            if (col + 1 < size && board[row][col + 1] === value) {
                return true;
            }
            if (row + 1 < size && board[row + 1][col] === value) {
                return true;
            }
        }
    }
    return false;
}
