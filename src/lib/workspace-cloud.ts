import {
  collection,
  doc,
  getDocsFromServer,
  runTransaction,
  type Firestore,
} from "firebase/firestore";
import {
  validatePersistedState,
  workspaceData,
  type PersistedPalaceState,
} from "@/store/usePalaceStore";

export type WorkspaceDocument = Record<string, unknown>;
export type WorkspaceDocuments = Map<string, WorkspaceDocument>;
export type LoadedWorkspace = {
  data: PersistedPalaceState;
  revision: number;
  exists: boolean;
};

export class WorkspaceConflict extends Error {
  constructor() {
    super(
      "This workspace changed in another tab or device. Download your current notes, then load the cloud version to continue.",
    );
    this.name = "WorkspaceConflict";
  }
}

export function encodeWorkspace(
  data: PersistedPalaceState,
): WorkspaceDocuments {
  const { rooms, anchors, ...preferences } = workspaceData(data);
  return new Map([
    ["preferences", { ...preferences }],
    ...rooms.map((room): [string, WorkspaceDocument] => [
      `room_${room.id}`,
      { ...room },
    ]),
    ...anchors.map((anchor): [string, WorkspaceDocument] => [
      `anchor_${anchor.id}`,
      { ...anchor },
    ]),
  ]);
}

export function documentChanges(
  before: WorkspaceDocuments,
  after: WorkspaceDocuments,
) {
  const changes = new Map<string, WorkspaceDocument | null>();
  for (const [id, value] of after) {
    if (JSON.stringify(before.get(id)) !== JSON.stringify(value))
      changes.set(id, value);
  }
  for (const id of before.keys()) if (!after.has(id)) changes.set(id, null);
  return changes;
}

export async function loadWorkspace(
  db: Firestore,
  uid: string,
): Promise<LoadedWorkspace> {
  const snapshot = await getDocsFromServer(
    collection(db, "users", uid, "workspace"),
  );
  const documents = new Map(
    snapshot.docs.map((item) => [item.id, item.data()]),
  );
  const meta = documents.get("meta");
  if (!meta) {
    if (documents.size)
      throw new Error(
        "This workspace is incomplete. Contact the project owner before making changes.",
      );
    return { data: validatePersistedState({}), revision: 0, exists: false };
  }
  if (
    meta.schema !== 1 ||
    !Number.isSafeInteger(meta.revision) ||
    meta.revision < 1
  ) {
    throw new Error(
      "This workspace uses an unsupported format. Please update NeuroQuest.",
    );
  }
  const data = validatePersistedState({
    ...documents.get("preferences"),
    rooms: [...documents]
      .filter(([id]) => id.startsWith("room_"))
      .map(([, value]) => value),
    anchors: [...documents]
      .filter(([id]) => id.startsWith("anchor_"))
      .map(([, value]) => value),
  });
  return { data, revision: meta.revision, exists: true };
}

/** An atomic revision check prevents a stale tab from silently replacing newer study work. */
export async function saveWorkspace(
  db: Firestore,
  uid: string,
  before: PersistedPalaceState | null,
  after: PersistedPalaceState,
  revision: number,
): Promise<number> {
  const changes = documentChanges(
    before ? encodeWorkspace(before) : new Map(),
    encodeWorkspace(after),
  );
  if (!changes.size) return revision;
  const metaRef = doc(db, "users", uid, "workspace", "meta");
  return runTransaction(db, async (transaction) => {
    const meta = await transaction.get(metaRef);
    const current = meta.exists() ? meta.data().revision : 0;
    if (current !== revision) throw new WorkspaceConflict();
    for (const [id, value] of changes) {
      const ref = doc(db, "users", uid, "workspace", id);
      if (value === null) transaction.delete(ref);
      else transaction.set(ref, value);
    }
    transaction.set(metaRef, { schema: 1, revision: revision + 1 });
    return revision + 1;
  });
}
