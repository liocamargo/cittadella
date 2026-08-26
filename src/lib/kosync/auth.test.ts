import { describe, expect, it, vi } from "vitest";
import { verificarCredencialesKosync } from "./auth";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({ get: getMock }),
    }),
  }),
}));

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/kosync/users/auth", { headers });
}

describe("verificarCredencialesKosync", () => {
  it("rechaza si falta el header x-auth-user", async () => {
    expect(await verificarCredencialesKosync(request({ "x-auth-key": "abc" }))).toBeNull();
  });

  it("rechaza si falta el header x-auth-key", async () => {
    expect(await verificarCredencialesKosync(request({ "x-auth-user": "uid1" }))).toBeNull();
  });

  it("rechaza si el perfil no tiene clave de sincronización configurada", async () => {
    getMock.mockResolvedValueOnce({ data: () => ({}) });
    const res = await verificarCredencialesKosync(
      request({ "x-auth-user": "uid1", "x-auth-key": "abc" })
    );
    expect(res).toBeNull();
  });

  it("rechaza si el hash no coincide", async () => {
    getMock.mockResolvedValueOnce({
      data: () => ({ claveSincronizacionHash: "otrohash" }),
    });
    const res = await verificarCredencialesKosync(
      request({ "x-auth-user": "uid1", "x-auth-key": "abc" })
    );
    expect(res).toBeNull();
  });

  it("acepta cuando el hash coincide, sin importar mayúsculas en el header", async () => {
    getMock.mockResolvedValueOnce({
      data: () => ({ claveSincronizacionHash: "abc123" }),
    });
    const res = await verificarCredencialesKosync(
      request({ "x-auth-user": "uid1", "x-auth-key": "ABC123" })
    );
    expect(res).toEqual({ uid: "uid1" });
  });
});
