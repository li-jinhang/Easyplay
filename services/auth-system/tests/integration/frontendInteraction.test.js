const request = require("supertest");

describe("Frontend interaction integration", () => {
  let app;

  beforeAll(() => {
    process.env.ENABLE_FRONTEND = "true";
    jest.resetModules();
    app = require("../../src/app");
  });

  test("GET / should return CSP that blocks inline scripts and use external main.js", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("script-src-attr 'none'");
    expect(res.text).toContain('<script src="./main.js"></script>');
    expect(res.text).not.toContain("首页登录/注册模块已加载");
    expect(res.text).not.toContain("onclick=");
  });

  test("GET /main.js should be served and contain event binding logic", async () => {
    const res = await request(app).get("/main.js");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
    expect(res.text).toContain("DOMContentLoaded");
    expect(res.text).toContain('addEventListener("click"');
    expect(res.text).toContain('querySelectorAll(".game-card[data-route]")');
  });

  test("GET /Easyplay/main.js should map to frontend root script for subpath deploy", async () => {
    const res = await request(app).get("/Easyplay/main.js");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
    expect(res.text).toContain('querySelectorAll(".game-card[data-route]")');
  });

  test("GET /health should keep backend API available", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("POST /Easyplay/api/login should route to API under subpath deploy", async () => {
    const res = await request(app).post("/Easyplay/api/login").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
