const fs = require("fs");
const path = require("path");
const request = require("supertest");

const TEST_DB_PATH = path.join(__dirname, "..", "..", "data", "game.load.test.db");
jest.setTimeout(30000);

describe("Game API load check", () => {
  let app;
  let db;
  let token = "";

  beforeAll(async () => {
    process.env.DB_PATH = TEST_DB_PATH;
    process.env.JWT_SECRET = "test-secret";
    process.env.ENABLE_FRONTEND = "false";
    process.env.BCRYPT_ROUNDS = "4";

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    jest.resetModules();
    const dbModule = require("../../src/db");
    await dbModule.initializeDatabase();
    db = dbModule.db;
    app = require("../../src/app");

    await request(app).post("/api/register").send({
      username: "load_user",
      email: "load_user@example.com",
      password: "12345678",
    });
    const login = await request(app).post("/api/login").send({
      username: "load_user",
      password: "12345678",
    });
    token = login.body.token;
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

  test("并发创建房间压力检查", async () => {
    const requests = Array.from({ length: 30 }, () =>
      request(app)
        .post("/api/game/rooms")
        .set("Authorization", `Bearer ${token}`)
        .send({ side: "red" })
    );
    const responses = await Promise.all(requests);
    const okCount = responses.filter((res) => res.statusCode === 201).length;
    expect(okCount).toBeGreaterThanOrEqual(25);
  });
});
