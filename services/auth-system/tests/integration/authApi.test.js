const fs = require("fs");
const path = require("path");
const request = require("supertest");

const TEST_DB_PATH = path.join(__dirname, "..", "..", "data", "auth.test.db");

describe("Auth API integration", () => {
  let app;
  let db;

  beforeAll(async () => {
    process.env.DB_PATH = TEST_DB_PATH;
    process.env.JWT_SECRET = "test-secret";
    process.env.BCRYPT_ROUNDS = "4";

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    jest.resetModules();

    const dbModule = require("../../src/db");
    await dbModule.initializeDatabase();
    db = dbModule.db;
    app = require("../../src/app");
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test("POST /api/register should create user successfully", async () => {
    const res = await request(app).post("/api/register").send({
      username: "demo_user",
      email: "demo_user@example.com",
      password: "12345678",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.username).toBe("demo_user");
    expect(res.body.user.email).toBe("demo_user@example.com");
    expect(res.body.user.id).toBeDefined();
  });

  test("POST /api/register should reject duplicate username", async () => {
    await request(app).post("/api/register").send({
      username: "dup_user",
      email: "dup_user@example.com",
      password: "12345678",
    });

    const res = await request(app).post("/api/register").send({
      username: "dup_user",
      email: "dup_user_2@example.com",
      password: "87654321",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/用户名已存在/);
  });

  test("POST /api/register should reject duplicate email", async () => {
    await request(app).post("/api/register").send({
      username: "dup_email_a",
      email: "dup_email@example.com",
      password: "12345678",
    });

    const res = await request(app).post("/api/register").send({
      username: "dup_email_b",
      email: "dup_email@example.com",
      password: "87654321",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/邮箱已存在/);
  });

  test("POST /api/register should validate empty values", async () => {
    const res = await request(app).post("/api/register").send({
      username: "",
      email: "",
      password: "",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("POST /api/register should reject non-8-length password", async () => {
    const res = await request(app).post("/api/register").send({
      username: "short_pwd",
      email: "short_pwd@example.com",
      password: "1234",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/密码长度必须为8位/);
  });

  test("POST /api/register should reject invalid email format", async () => {
    const res = await request(app).post("/api/register").send({
      username: "invalid_email",
      email: "invalid-email",
      password: "12345678",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/邮箱格式不正确/);
  });

  test("POST /api/register should support boundary username length", async () => {
    const minNameRes = await request(app).post("/api/register").send({
      username: "abc",
      email: "abc@example.com",
      password: "12345678",
    });
    expect(minNameRes.statusCode).toBe(201);

    const tooLongRes = await request(app).post("/api/register").send({
      username: "a".repeat(33),
      email: "too_long@example.com",
      password: "12345678",
    });
    expect(tooLongRes.statusCode).toBe(400);
    expect(tooLongRes.body.error).toMatch(/用户名长度需在3到32之间/);
  });

  test("POST /api/login should return token and set cookie", async () => {
    await request(app).post("/api/register").send({
      username: "login_user",
      email: "login_user@example.com",
      password: "12345678",
    });

    const res = await request(app).post("/api/login").send({
      username: "login_user",
      password: "12345678",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("login_user@example.com");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("POST /api/login should reject wrong password", async () => {
    await request(app).post("/api/register").send({
      username: "wrong_pwd_user",
      email: "wrong_pwd_user@example.com",
      password: "12345678",
    });

    const res = await request(app).post("/api/login").send({
      username: "wrong_pwd_user",
      password: "87654321",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/用户名或密码错误/);
  });

  test("GET /api/me should return current user by bearer token", async () => {
    await request(app).post("/api/register").send({
      username: "me_user",
      email: "me_user@example.com",
      password: "12345678",
    });

    const loginRes = await request(app).post("/api/login").send({
      username: "me_user",
      password: "12345678",
    });

    const meRes = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.user.username).toBe("me_user");
    expect(meRes.body.user.email).toBe("me_user@example.com");
  });
});
