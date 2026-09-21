import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "s3cret-admin-key";
const request = (headers: Record<string, string> = {}) => new Request("http://x.test/api", { headers });

// `environment` is read when the config module loads, so re-import per scenario.
async function loadAuth(env: { ENVIRONMENT?: string; ADMIN_API_KEY?: string }) {
  vi.resetModules();
  vi.stubEnv("ENVIRONMENT", env.ENVIRONMENT ?? "");
  vi.stubEnv("ADMIN_API_KEY", env.ADMIN_API_KEY ?? "");
  return import("../auth");
}

afterEach(() => vi.unstubAllEnvs());

describe("admin authorization", () => {
  it("accepts the right key", async () => {
    const { requireAdmin } = await loadAuth({ ENVIRONMENT: "dev", ADMIN_API_KEY: KEY });
    expect(() => requireAdmin(request({ authorization: `Bearer ${KEY}` }))).not.toThrow();
  });

  it.each([
    ["no header", {}],
    ["wrong key", { authorization: "Bearer nope" }],
    ["wrong scheme", { authorization: `Basic ${KEY}` }],
    ["empty bearer", { authorization: "Bearer " }],
  ])("rejects %s with 401", async (_label, headers) => {
    const { requireAdmin } = await loadAuth({ ENVIRONMENT: "dev", ADMIN_API_KEY: KEY });
    expect(() => requireAdmin(request(headers))).toThrowError(expect.objectContaining({ status: 401 }));
  });

  it("stays open in local when no key is configured", async () => {
    const { requireAdmin } = await loadAuth({ ENVIRONMENT: "local" });
    expect(() => requireAdmin(request())).not.toThrow();
  });

  it("refuses to run outside local when no key is configured", async () => {
    const { requireAdmin } = await loadAuth({ ENVIRONMENT: "prod" });
    expect(() => requireAdmin(request())).toThrowError(expect.objectContaining({ status: 503 }));
  });

  it("still enforces the key in local once one is configured", async () => {
    const { requireAdmin } = await loadAuth({ ENVIRONMENT: "local", ADMIN_API_KEY: KEY });
    expect(() => requireAdmin(request())).toThrowError(expect.objectContaining({ status: 401 }));
  });
});

describe("error handling wrapper", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("turns AppErrors into their status with CORS headers", async () => {
    const { withErrorHandling } = await import("../cors");
    const { NotFoundError } = await import("../../errors");
    const response = await withErrorHandling(async () => {
      throw new NotFoundError("Product not found");
    })();

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "Product not found" });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("hides the details of unexpected errors", async () => {
    const { withErrorHandling } = await import("../cors");
    const response = await withErrorHandling(async () => {
      throw new Error("dynamodb exploded: table X at arn:aws:...");
    })();

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("dynamodb");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("customer id header", () => {
  it("accepts a guest uuid and rejects anything else", async () => {
    const { getCustomerId } = await import("../request");
    const good = "guest-11111111-1111-4111-8111-111111111111";

    expect(getCustomerId(request({ "x-customer-id": good }))).toBe(good);
    for (const bad of ["", "user-001", "guest-123", "../../etc/passwd"]) {
      expect(() => getCustomerId(request({ "x-customer-id": bad }))).toThrowError(expect.objectContaining({ status: 400 }));
    }
    expect(() => getCustomerId(request())).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
