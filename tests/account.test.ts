import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameEmail, accountError } from "@/lib/account";
import {
  clearWorkspace,
  replaceWorkspace,
  usePalaceStore,
  validatePersistedState,
} from "@/store/usePalaceStore";
import { encodeWorkspace, documentChanges } from "@/lib/workspace-cloud";

describe("username identities", () => {
  it("makes case variants the same account", () => {
    expect(normalizeUsername("  College_Student ")).toBe("college_student");
    expect(usernameEmail("COLLEGE_student")).toBe(
      usernameEmail("college_student"),
    );
  });
  it.each([
    "ab",
    "a".repeat(25),
    "a/b",
    "a@b.com",
    "_student",
    "a.b",
    "a b",
    "😀student",
  ])("rejects ambiguous or unsupported username %s", (name) => {
    expect(() => usernameEmail(name)).toThrow();
  });
  it("does not reveal whether an account exists during failed login", () => {
    expect(accountError({ code: "auth/user-not-found" })).toBe(
      accountError({ code: "auth/wrong-password" }),
    );
  });
});

describe("private workspace boundary", () => {
  it("removes the previous account's notes, camera and session ratings", () => {
    replaceWorkspace(validatePersistedState({}));
    usePalaceStore.getState().selectAnchor("cs-system-design");
    usePalaceStore.getState().rateAnchor("cs-system-design", "easy");
    clearWorkspace();
    const state = usePalaceStore.getState();
    expect(state.anchors).toEqual([]);
    expect(state.rooms).toEqual([]);
    expect(state.selectedAnchorId).toBeNull();
    expect(state.sessionRatings).toEqual({});
    expect(state.cameraTarget).toBeNull();
  });
  it("never reloads anonymous notes into the signed-in store", async () => {
    clearWorkspace();
    await usePalaceStore.persist.rehydrate();
    // Its intentionally empty storage has no legacy data to return.
    expect(usePalaceStore.getState().anchors).toEqual([]);
  });
  it("writes each note separately, only updating changed documents", () => {
    const first = validatePersistedState({});
    const second = {
      ...first,
      anchors: first.anchors.map((a, i) =>
        i ? a : { ...a, content: "Updated note" },
      ),
    };
    const changes = documentChanges(
      encodeWorkspace(first),
      encodeWorkspace(second),
    );
    expect([...changes.keys()]).toEqual([`anchor_${first.anchors[0].id}`]);
  });
  it("represents a deletion explicitly without deleting unrelated notes", () => {
    const first = validatePersistedState({});
    const second = { ...first, anchors: first.anchors.slice(1) };
    expect([
      ...documentChanges(encodeWorkspace(first), encodeWorkspace(second)),
    ]).toEqual([[`anchor_${first.anchors[0].id}`, null]]);
  });
});
