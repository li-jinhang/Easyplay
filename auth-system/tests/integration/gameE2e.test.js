const fs = require("fs");
const path = require("path");
const request = require("supertest");

const TEST_DB_PATH = path.join(__dirname, "..", "..", "data", "game.e2e.test.db");
jest.setTimeout(30000);

describe("Game E2E flow (API)", () => {
  let app;
  let db;
  let redToken = "";
  let blackToken = "";

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
      username: "e2e_red",
      email: "e2e_red@example.com",
      password: "12345678",
    });
    await request(app).post("/api/register").send({
      username: "e2e_black",
      email: "e2e_black@example.com",
      password: "12345678",
    });
    redToken = (
      await request(app).post("/api/login").send({
        username: "e2e_red",
        password: "12345678",
      })
    ).body.token;
    blackToken = (
      await request(app).post("/api/login").send({
        username: "e2e_black",
        password: "12345678",
      })
    ).body.token;
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

  test("创建房间-加入-查询房间", async () => {
    const createRes = await request(app)
      .post("/api/game/rooms")
      .set("Authorization", `Bearer ${redToken}`)
      .send({ side: "red" });
    expect(createRes.statusCode).toBe(201);
    const roomCode = createRes.body.room.roomCode;

    const joinRes = await request(app)
      .post(`/api/game/rooms/${roomCode}/join`)
      .set("Authorization", `Bearer ${blackToken}`)
      .send({});
    expect(joinRes.statusCode).toBe(200);
    expect(joinRes.body.room.status).toBe("playing");

    const roomRes = await request(app)
      .get(`/api/game/rooms/${roomCode}`)
      .set("Authorization", `Bearer ${redToken}`);
    expect(roomRes.statusCode).toBe(200);
    expect(roomRes.body.room.roomCode).toBe(roomCode);
  });
});
