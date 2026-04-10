const {
  comparePassword,
  hashPassword,
  signAccessToken,
  verifyAccessToken,
} = require("../../src/services/authService");

describe("authService", () => {
  test("should hash password and validate correctly", async () => {
    const plain = "12345678";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);

    const matched = await comparePassword(plain, hash);
    expect(matched).toBe(true);
  });

  test("should sign and verify JWT token", () => {
    const token = signAccessToken({ id: 10, username: "alice_01" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(10);
    expect(payload.username).toBe("alice_01");
  });
});
