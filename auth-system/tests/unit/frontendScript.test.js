const fs = require("fs");
const path = require("path");

describe("frontend main.js unit checks", () => {
  const MAIN_JS_PATH = path.join(__dirname, "..", "..", "..", "main.js");
  let scriptContent;

  beforeAll(() => {
    scriptContent = fs.readFileSync(MAIN_JS_PATH, "utf8");
  });

  test("should initialize only after DOM is ready", () => {
    expect(scriptContent).toContain('if (document.readyState === "loading")');
    expect(scriptContent).toContain('document.addEventListener("DOMContentLoaded", initHomePage)');
  });

  test("should bind click and keyboard events for game cards", () => {
    expect(scriptContent).toContain('querySelectorAll(".game-card[data-route]")');
    expect(scriptContent).toContain('card.addEventListener("click"');
    expect(scriptContent).toContain('card.addEventListener("keydown"');
    expect(scriptContent).toContain('event.key === "Enter" || event.key === " "');
  });

  test("should bind login/register submit handlers", () => {
    expect(scriptContent).toContain('loginForm.addEventListener("submit"');
    expect(scriptContent).toContain('registerForm.addEventListener("submit"');
  });
});
