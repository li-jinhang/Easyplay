const fs = require("fs");
const path = require("path");
const request = require("supertest");

const TEST_DB_PATH = path.join(__dirname, "..", "..", "data", "game.test.db");
jest.setTimeout(30000);

describe("Game API integration", () => {
  let app;
  let db;
  let tokenA = "";
  let tokenB = "";

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

    const regA = await request(app).post("/api/register").send({
      username: "player_a",
      email: "player_a@example.com",
      password: "12345678",
    });
    expect(regA.statusCode).toBe(201);

    const regB = await request(app).post("/api/register").send({
      username: "player_b",
      email: "player_b@example.com",
      password: "12345678",
    });
    expect(regB.statusCode).toBe(201);

    const loginA = await request(app).post("/api/login").send({
      username: "player_a",
      password: "12345678",
    });
    tokenA = loginA.body.token;

    const loginB = await request(app).post("/api/login").send({
      username: "player_b",
      password: "12345678",
    });
    tokenB = loginB.body.token;
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

  test("创建并加入房间", async () => {
    const createRes = await request(app)
      .post("/api/game/rooms")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ side: "red" });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.room.roomCode.length).toBeGreaterThanOrEqual(6);

    const roomCode = createRes.body.room.roomCode;
    const joinRes = await request(app)
      .post(`/api/game/rooms/${roomCode}/join`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({});

    expect(joinRes.statusCode).toBe(200);
    expect(joinRes.body.room.status).toBe("playing");
  });

  test("获取个人战绩信息", async () => {
    const profile = await request(app)
      .get("/api/game/profile")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(profile.statusCode).toBe(200);
    expect(profile.body.stats).toBeDefined();
    expect(Array.isArray(profile.body.history)).toBe(true);
  });
});
