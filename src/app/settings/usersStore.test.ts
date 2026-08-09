import { beforeEach, describe, expect, it } from "vitest";
import {
  acceptInvite,
  CREDENTIALS_STORAGE_KEY,
  getInviteByToken,
  inviteUser,
  INVITES_STORAGE_KEY,
  loadManagedUsers,
  USERS_STORAGE_KEY,
  verifyCredential,
} from "./usersStore";

function installMemoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      dispatchEvent: () => true,
      location: { origin: "http://localhost:5173" },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

describe("usersStore invitations", () => {
  beforeEach(() => {
    installMemoryStorage();
    window.localStorage.removeItem(USERS_STORAGE_KEY);
    window.localStorage.removeItem(INVITES_STORAGE_KEY);
    window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
  });

  it("invites a user and activates via token + password", () => {
    const { invite, user } = inviteUser({
      name: "Test Responsable",
      email: "test.resp@sgi.org",
      role: "groupe",
      chapitre: "Rissho Ankoku Ron",
      district: "District Bodhisattva",
      groupe: "BODDHISATTVA",
    });

    expect(user.status).toBe("En attente");
    expect(getInviteByToken(invite.token)?.status).toBe("pending");

    const activated = acceptInvite(invite.token, "secret1");
    expect(activated.status).toBe("Actif");
    expect(verifyCredential("test.resp@sgi.org", "secret1")).toBe(true);
    expect(loadManagedUsers().find((item) => item.email === "test.resp@sgi.org")?.status).toBe("Actif");
  });

  it("rejects duplicate emails", () => {
    inviteUser({
      name: "Un",
      email: "dup@sgi.org",
      role: "chapitre",
    });
    expect(() =>
      inviteUser({
        name: "Deux",
        email: "dup@sgi.org",
        role: "district",
      }),
    ).toThrow(/existe déjà/i);
  });
});
