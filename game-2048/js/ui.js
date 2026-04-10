import { GRID_SIZE, KEY_TO_DIRECTION } from "./config.js";

function toCellStyle(row, col) {
    return {
        left: `calc(var(--gap) + ${col} * (var(--step) + var(--gap)))`,
        top: `calc(var(--gap) + ${row} * (var(--step) + var(--gap)))`
    };
}

function hasCell(cells, row, col) {
    return cells.some((cell) => cell.row === row && cell.col === col);
}

export class GameUI {
    constructor(game, elements) {
        this.game = game;
        this.elements = elements;
        this.animating = false;
    }

    init() {
        this.renderBackgroundGrid();
        this.bindEvents();
        this.render(this.game.getState());
    }

    renderBackgroundGrid() {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
            const cell = document.createElement("div");
            cell.className = "grid-cell";
            fragment.appendChild(cell);
        }
        this.elements.gridBackground.innerHTML = "";
        this.elements.gridBackground.appendChild(fragment);
    }

    bindEvents() {
        this.elements.restartBtn.addEventListener("click", () => this.restart());
        this.elements.overlayRestartBtn.addEventListener("click", () => this.restart());

        window.addEventListener("keydown", (event) => {
            const direction = KEY_TO_DIRECTION[event.key];
            if (!direction || this.animating) {
                return;
            }

            event.preventDefault();
            const result = this.game.move(direction);
            if (!result.moved) {
                if (result.over) {
                    this.showOverlay("游戏失败", "已没有可用移动，点击下方按钮重新开始。");
                }
                return;
            }

            this.render(this.game.getState());
            if (result.won) {
                this.showOverlay("恭喜获胜", "你已经合成 2048，继续挑战或重新开始都可以。");
            } else if (result.over) {
                this.showOverlay("游戏失败", "棋盘已满且无法合并，点击按钮重新开始。");
            }
        });
    }

    restart() {
        this.hideOverlay();
        this.game.reset();
        this.render(this.game.getState());
    }

    render(state) {
        this.elements.score.textContent = String(state.score);
        this.elements.bestScore.textContent = String(state.bestScore);
        this.renderTiles(state.board, state.lastMoveMeta);
    }

    renderTiles(board, moveMeta) {
        const mergedCells = moveMeta?.mergedCells ?? [];
        const newTiles = moveMeta?.newTile ?? [];
        const fragment = document.createDocumentFragment();

        for (let row = 0; row < board.length; row += 1) {
            for (let col = 0; col < board[row].length; col += 1) {
                const value = board[row][col];
                if (!value) {
                    continue;
                }

                const tile = document.createElement("div");
                tile.className = `tile tile-${value <= 2048 ? value : "super"}`;
                tile.textContent = String(value);

                if (hasCell(mergedCells, row, col)) {
                    tile.classList.add("tile-merged");
                }
                if (hasCell(newTiles, row, col)) {
                    tile.classList.add("tile-new");
                }

                const pos = toCellStyle(row, col);
                tile.style.left = pos.left;
                tile.style.top = pos.top;
                fragment.appendChild(tile);
            }
        }

        // 使用下一帧切换内容，避免短时间内重复输入导致动画视觉抖动。
        this.animating = true;
        this.elements.tilesLayer.innerHTML = "";
        this.elements.tilesLayer.appendChild(fragment);
        window.setTimeout(() => {
            this.animating = false;
        }, 140);
    }

    showOverlay(title, desc) {
        this.elements.overlayTitle.textContent = title;
        this.elements.overlayDesc.textContent = desc;
        this.elements.overlay.classList.remove("hidden");
    }

    hideOverlay() {
        this.elements.overlay.classList.add("hidden");
    }
}
