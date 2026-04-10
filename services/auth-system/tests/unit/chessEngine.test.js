const {
  applyMove,
  createInitialGameState,
  isLegalMove,
} = require("../../src/services/chessEngine");

describe("chessEngine", () => {
  test("初始红方兵可以前进一格", () => {
    const state = createInitialGameState();
    const move = { fromX: 0, fromY: 6, toX: 0, toY: 5 };
    expect(isLegalMove(state, move)).toBe(true);
  });

  test("红方首回合不能横走兵", () => {
    const state = createInitialGameState();
    const move = { fromX: 0, fromY: 6, toX: 1, toY: 6 };
    expect(isLegalMove(state, move)).toBe(false);
  });

  test("非法走子应返回失败", () => {
    const state = createInitialGameState();
    const result = applyMove(state, { fromX: 0, fromY: 6, toX: 1, toY: 6 }, { userId: 1 });
    expect(result.ok).toBe(false);
  });

  test("合法走子后回合切换为黑方", () => {
    const state = createInitialGameState();
    const result = applyMove(state, { fromX: 0, fromY: 6, toX: 0, toY: 5 }, { userId: 1 });
    expect(result.ok).toBe(true);
    expect(result.state.turn).toBe("black");
    expect(result.state.history.length).toBe(1);
  });
});
