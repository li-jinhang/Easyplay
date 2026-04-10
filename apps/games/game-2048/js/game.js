import { GRID_SIZE, STORAGE_KEY_BEST_SCORE, TARGET_TILE } from "./config.js";
import { cloneMatrix, createMatrix, getEmptyCells, hasAnyMoves, randomInt } from "./utils.js";

function areLinesEqual(a, b) {
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export class Game2048 {
    constructor(size = GRID_SIZE) {
        this.size = size;
        this.bestScore = this.loadBestScore();
        this.reset();
    }

    loadBestScore() {
        try {
            const value = Number(window.localStorage.getItem(STORAGE_KEY_BEST_SCORE));
            return Number.isFinite(value) && value > 0 ? value : 0;
        } catch {
            return 0;
        }
    }

    saveBestScore() {
        try {
            window.localStorage.setItem(STORAGE_KEY_BEST_SCORE, String(this.bestScore));
        } catch {
            // 本地存储不可用时静默降级。
        }
    }

    reset() {
        this.board = createMatrix(this.size);
        this.score = 0;
        this.won = false;
        this.over = false;

        const newTileA = this.addRandomTile();
        const newTileB = this.addRandomTile();

        this.lastMoveMeta = {
            moved: true,
            mergedCells: [],
            newTile: [newTileA, newTileB].filter(Boolean)
        };
    }

    getState() {
        return {
            board: cloneMatrix(this.board),
            score: this.score,
            bestScore: this.bestScore,
            won: this.won,
            over: this.over,
            lastMoveMeta: this.lastMoveMeta
        };
    }

    addRandomTile() {
        const emptyCells = getEmptyCells(this.board);
        if (emptyCells.length === 0) {
            return null;
        }

        const pick = emptyCells[randomInt(emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        this.board[pick.row][pick.col] = value;
        return { row: pick.row, col: pick.col, value };
    }

    extractLine(index, direction) {
        const line = [];
        for (let step = 0; step < this.size; step += 1) {
            if (direction === "left") {
                line.push(this.board[index][step]);
            } else if (direction === "right") {
                line.push(this.board[index][this.size - 1 - step]);
            } else if (direction === "up") {
                line.push(this.board[step][index]);
            } else {
                line.push(this.board[this.size - 1 - step][index]);
            }
        }
        return line;
    }

    writeLine(index, direction, line) {
        for (let step = 0; step < this.size; step += 1) {
            if (direction === "left") {
                this.board[index][step] = line[step];
            } else if (direction === "right") {
                this.board[index][this.size - 1 - step] = line[step];
            } else if (direction === "up") {
                this.board[step][index] = line[step];
            } else {
                this.board[this.size - 1 - step][index] = line[step];
            }
        }
    }

    mapStepToCell(index, step, direction) {
        if (direction === "left") {
            return { row: index, col: step };
        }
        if (direction === "right") {
            return { row: index, col: this.size - 1 - step };
        }
        if (direction === "up") {
            return { row: step, col: index };
        }
        return { row: this.size - 1 - step, col: index };
    }

    // 将一条线压缩到前方并执行相邻合并，同时返回本线合并位置用于动画。
    collapseLine(line, lineIndex, direction) {
        const compacted = line.filter((value) => value !== 0);
        const result = [];
        const mergedSteps = [];
        let scoreGain = 0;

        for (let i = 0; i < compacted.length; i += 1) {
            const current = compacted[i];
            const next = compacted[i + 1];
            if (next !== undefined && current === next) {
                const merged = current * 2;
                result.push(merged);
                scoreGain += merged;
                mergedSteps.push(result.length - 1);
                i += 1;
            } else {
                result.push(current);
            }
        }

        while (result.length < this.size) {
            result.push(0);
        }

        const mergedCells = mergedSteps.map((step) => this.mapStepToCell(lineIndex, step, direction));
        return { line: result, scoreGain, mergedCells };
    }

    move(direction) {
        if (this.over) {
            return { moved: false };
        }

        let moved = false;
        let scoreGain = 0;
        const mergedCells = [];

        for (let index = 0; index < this.size; index += 1) {
            const originalLine = this.extractLine(index, direction);
            const { line: collapsed, scoreGain: lineScore, mergedCells: lineMerged } = this.collapseLine(
                originalLine,
                index,
                direction
            );

            if (!areLinesEqual(originalLine, collapsed)) {
                moved = true;
            }
            this.writeLine(index, direction, collapsed);
            scoreGain += lineScore;
            mergedCells.push(...lineMerged);
        }

        if (!moved) {
            if (!hasAnyMoves(this.board)) {
                this.over = true;
            }
            return { moved: false, won: this.won, over: this.over };
        }

        this.score += scoreGain;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        const newTile = this.addRandomTile();
        if (!this.won) {
            this.won = this.board.some((row) => row.some((value) => value >= TARGET_TILE));
        }
        this.over = !hasAnyMoves(this.board);

        this.lastMoveMeta = {
            moved: true,
            mergedCells,
            newTile: newTile ? [newTile] : []
        };

        return {
            moved: true,
            score: this.score,
            bestScore: this.bestScore,
            mergedCells,
            newTile,
            won: this.won,
            over: this.over
        };
    }
}
