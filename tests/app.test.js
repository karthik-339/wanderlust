process.env.NODE_ENV = "test";

const request = require("supertest");
const { app } = require("../app");

describe("App smoke tests", () => {
  test("GET /healthz returns status ok", async () => {
    const res = await request(app).get("/healthz");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("GET /privacy responds successfully", async () => {
    const res = await request(app).get("/privacy");

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Privacy policy page coming soon.");
  });

  test("GET /terms responds successfully", async () => {
    const res = await request(app).get("/terms");

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Terms and conditions page coming soon.");
  });

  test("Unknown route returns 404", async () => {
    const res = await request(app).get("/not-a-real-page");

    expect(res.statusCode).toBe(404);
    expect(res.text).toContain("Page Not Found");
  });
});
