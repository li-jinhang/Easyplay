const fs = require("fs");
const path = require("path");

describe("chinese chess auth script checks", () => {
  const CHESS_APP_JS_PATH = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "apps",
    "games",
    "chinese-chess",
    "app.js"
  );
  let scriptContent;

  beforeAll(() => {
    scriptContent = fs.readFileSync(CHESS_APP_JS_PATH, "utf8");
  });

  test("should persist token from cookie fallback into localStorage", () => {
    expect(scriptContent).toContain('return getCookie("token")');
    expect(scriptContent).toContain('localStorage.setItem("easyplay_token", state.token)');
  });

  test("should clear auth state when /api/me reports unauthorized", () => {
    expect(scriptContent).toContain("function clearAuthState()");
    expect(scriptContent).toContain('localStorage.removeItem("easyplay_token")');
    expect(scriptContent).toContain("error && error.status === 401");
    expect(scriptContent).toContain('throw new Error("登录态失效")');
  });

  test("should expose network and malformed-response error handling", () => {
    expect(scriptContent).toContain('new Error("服务响应格式异常")');
    expect(scriptContent).toContain('new Error("网络异常，请稍后重试")');
    expect(scriptContent).toContain('new Error("认证校验失败")');
  });
});
