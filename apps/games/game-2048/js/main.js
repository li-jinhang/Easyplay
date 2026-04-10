import { Game2048 } from "./game.js";
import { GameUI } from "./ui.js";

const elements = {
    board: document.getElementById("board"),
    gridBackground: document.getElementById("grid-background"),
    tilesLayer: document.getElementById("tiles-layer"),
    score: document.getElementById("score"),
    bestScore: document.getElementById("best-score"),
    restartBtn: document.getElementById("restart-btn"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayDesc: document.getElementById("overlay-desc"),
    overlayRestartBtn: document.getElementById("overlay-restart-btn")
};

function assertDomReady(dom) {
    const missing = Object.entries(dom)
        .filter(([, value]) => value === null)
        .map(([key]) => key);
    if (missing.length > 0) {
        throw new Error(`初始化失败：缺少必要节点 -> ${missing.join(", ")}`);
    }
}

assertDomReady(elements);

const game = new Game2048();
const ui = new GameUI(game, elements);
ui.init();
