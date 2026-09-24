import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type PersistStorage,
} from "zustand/middleware";
import { INITIAL_ANCHORS, ROOMS } from "@/lib/data";
import type {
  AnchorShape,
  AnchorUpdate,
  MemoryAnchor,
  NewAnchorInput,
  NewRoomInput,
  Rating,
  Retention,
  Room,
  RoomIcon,
  StudyMode,
  Vec3,
} from "@/lib/types";

export const PALACE_STORAGE_KEY = "neuroquest-palace";
export const PALACE_STORAGE_VERSION = 2;
export const MAX_ROOMS = 50;

export interface PalaceState {
  anchors: MemoryAnchor[];
  rooms: Room[];
  activeRoomId: string;
  mode: StudyMode;
  selectedAnchorId: string | null;
  cameraTarget: Vec3 | null;
  cameraResetKey: number;
  isAddOpen: boolean;
  soundEnabled: boolean;
  effectsEnabled: boolean;
  sessionRatings: Record<string, Rating>;
  setMode: (mode: StudyMode) => void;
  selectAnchor: (id: string | null) => void;
  setRoom: (roomId: string) => void;
  addRoom: (input: NewRoomInput) => string;
  resetCamera: () => void;
  addAnchor: (input: NewAnchorInput) => string;
  updateAnchor: (id: string, updates: AnchorUpdate) => void;
  deleteAnchor: (id: string) => void;
  rateAnchor: (id: string, rating: Rating) => void;
  setAddOpen: (open: boolean) => void;
  toggleSound: () => void;
  toggleEffects: () => void;
}

export interface PersistedPalaceState {
  rooms: Room[];
  anchors: MemoryAnchor[];
  activeRoomId: string;
  mode: StudyMode;
  soundEnabled: boolean;
  effectsEnabled: boolean;
}

const shapes = new Set<AnchorShape>([
  "crystal",
  "torus",
  "cube",
  "sphere",
  "pyramid",
  "knot",
]);
const statuses = new Set<Retention>(["new", "learning", "mastered"]);
const ratings = new Set<Rating>(["easy", "hard", "failed"]);
const roomIcons = new Set<RoomIcon>([
  "cpu",
  "heart",
  "landmark",
  "book",
  "flask",
  "globe",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function freshAnchors(): MemoryAnchor[] {
  return INITIAL_ANCHORS.map((anchor) => ({
    ...anchor,
    position: [...anchor.position] as Vec3,
  }));
}

function browserStorage(): PersistStorage<PersistedPalaceState> | undefined {
  return createJSONStorage<PersistedPalaceState>(() => ({
    getItem: (name) => {
      try {
        return typeof window !== "undefined"
          ? window.localStorage.getItem(name)
          : null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      // Private browsing and full storage must not prevent studying in memory.
      try {
        if (typeof window !== "undefined")
          window.localStorage.setItem(name, value);
      } catch {
        /* Retain the live session when persistent storage is unavailable. */
      }
    },
    removeItem: (name) => {
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(name);
      } catch {
        /* Storage may be disabled by browser policy. */
      }
    },
  }));
}

function normalizeRoomName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function validateRoom(value: unknown): Room | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(value.id) ||
    value.id in Object.prototype
  )
    return null;
  if (
    typeof value.name !== "string" ||
    !normalizeRoomName(value.name) ||
    value.name.length > 48
  )
    return null;
  if (typeof value.subtitle !== "string" || value.subtitle.length > 120)
    return null;
  if (typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color))
    return null;
  if (typeof value.icon !== "string" || !roomIcons.has(value.icon as RoomIcon))
    return null;
  return {
    id: value.id,
    name: normalizeRoomName(value.name),
    subtitle: value.subtitle.trim(),
    color: value.color,
    icon: value.icon as RoomIcon,
  };
}

function validateAnchor(
  value: unknown,
  roomIds: ReadonlySet<string>,
): MemoryAnchor | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(value.id) ||
    value.id in Object.prototype
  )
    return null;
  if (typeof value.roomId !== "string" || !roomIds.has(value.roomId))
    return null;
  if (
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 100
  )
    return null;
  if (typeof value.category !== "string" || value.category.length > 60)
    return null;
  if (typeof value.content !== "string" || value.content.length > 30_000)
    return null;
  if (typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color))
    return null;
  if (
    typeof value.shape !== "string" ||
    !shapes.has(value.shape as AnchorShape)
  )
    return null;
  if (
    !Array.isArray(value.position) ||
    value.position.length !== 3 ||
    !value.position.every(
      (coordinate, axis) =>
        typeof coordinate === "number" &&
        Number.isFinite(coordinate) &&
        (axis === 1
          ? coordinate >= 0 && coordinate <= 3
          : Math.abs(coordinate) <= 6),
    )
  )
    return null;

  return {
    id: value.id,
    roomId: value.roomId,
    title: value.title.trim(),
    category: value.category.trim() || "PERSONAL NOTE",
    content: value.content,
    color: value.color,
    shape: value.shape as AnchorShape,
    position: [...value.position] as Vec3,
    status:
      typeof value.status === "string" &&
      statuses.has(value.status as Retention)
        ? (value.status as Retention)
        : "new",
    reviewCount:
      typeof value.reviewCount === "number" &&
      Number.isInteger(value.reviewCount) &&
      value.reviewCount >= 0
        ? Math.min(value.reviewCount, 1_000_000)
        : 0,
    lastReviewedAt:
      typeof value.lastReviewedAt === "string" &&
      value.lastReviewedAt.length <= 40 &&
      !Number.isNaN(Date.parse(value.lastReviewedAt))
        ? value.lastReviewedAt
        : null,
  };
}

/** Never spread localStorage directly into the store: it must not replace actions or transient UI state. */
export function validatePersistedState(value: unknown): PersistedPalaceState {
  const source = isRecord(value) ? value : {};
  // Older local workspaces did not persist rooms. Restore their original
  // subjects when migrating, while an explicitly empty workspace stays empty.
  const hasPersistedRooms = Array.isArray(source.rooms);
  const hasLegacyRooms = !hasPersistedRooms && Array.isArray(source.anchors);
  const useDemoDefaults = !hasPersistedRooms && !Array.isArray(source.anchors);
  const rooms =
    hasLegacyRooms || useDemoDefaults
      ? ROOMS.map((room) => ({ ...room }))
      : [];
  const roomIds = new Set(rooms.map((room) => room.id));
  const roomNames = new Set(rooms.map((room) => room.name.toLowerCase()));
  if (Array.isArray(source.rooms)) {
    for (const candidate of source.rooms.slice(0, MAX_ROOMS)) {
      const room = validateRoom(candidate);
      if (
        !room ||
        roomIds.has(room.id) ||
        roomNames.has(room.name.toLowerCase()) ||
        rooms.length >= MAX_ROOMS
      )
        continue;
      rooms.push(room);
      roomIds.add(room.id);
      roomNames.add(room.name.toLowerCase());
    }
  }
  let anchors: MemoryAnchor[] = useDemoDefaults ? freshAnchors() : [];
  if (Array.isArray(source.anchors)) {
    const seen = new Set<string>();
    const valid = source.anchors.slice(0, 300).flatMap((candidate) => {
      const anchor = validateAnchor(candidate, roomIds);
      if (!anchor || seen.has(anchor.id)) return [];
      seen.add(anchor.id);
      return [anchor];
    });
    // Keep old local notes recoverable if their whole saved anchor list is corrupt.
    if (valid.length > 0) anchors = valid;
    else if (source.anchors.length > 0 && hasLegacyRooms)
      anchors = freshAnchors();
  }
  return {
    rooms,
    anchors,
    activeRoomId:
      typeof source.activeRoomId === "string" &&
      roomIds.has(source.activeRoomId)
        ? source.activeRoomId
        : rooms[0]?.id ?? "computer-science",
    mode: source.mode === "recall" ? "recall" : "explore",
    soundEnabled:
      typeof source.soundEnabled === "boolean" ? source.soundEnabled : false,
    effectsEnabled:
      typeof source.effectsEnabled === "boolean" ? source.effectsEnabled : true,
  };
}

function newId(): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `anchor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPalaceStore(options?: {
  storage?: PersistStorage<PersistedPalaceState>;
  skipHydration?: boolean;
  memoryOnly?: boolean;
}) {
  return create<PalaceState>()(
    persist<PalaceState, [], [], PersistedPalaceState>(
      (set, get) => ({
        anchors: freshAnchors(),
        rooms: ROOMS.map((room) => ({ ...room })),
        activeRoomId: "computer-science",
        mode: "explore",
        selectedAnchorId: null,
        cameraTarget: null,
        cameraResetKey: 0,
        isAddOpen: false,
        soundEnabled: false,
        effectsEnabled: true,
        sessionRatings: {},
        setMode: (mode) => {
          if ((mode !== "explore" && mode !== "recall") || mode === get().mode)
            return;
          set({
            mode,
            selectedAnchorId: null,
            cameraTarget: null,
            sessionRatings: {},
            isAddOpen: false,
            cameraResetKey: get().cameraResetKey + 1,
          });
        },
        selectAnchor: (id) => {
          if (id === null) {
            set({ selectedAnchorId: null, cameraTarget: null });
            return;
          }
          const anchor = get().anchors.find(
            (item) => item.id === id && item.roomId === get().activeRoomId,
          );
          if (anchor)
            set({ selectedAnchorId: id, cameraTarget: [...anchor.position] });
        },
        setRoom: (activeRoomId) => {
          if (
            !get().rooms.some((room) => room.id === activeRoomId) ||
            activeRoomId === get().activeRoomId
          )
            return;
          set({
            activeRoomId,
            selectedAnchorId: null,
            cameraTarget: null,
            isAddOpen: false,
            sessionRatings: {},
            cameraResetKey: get().cameraResetKey + 1,
          });
        },
        addRoom: (input) => {
          if (get().rooms.length >= MAX_ROOMS)
            throw new Error(
              `You can create up to ${MAX_ROOMS} palaces in this workspace.`,
            );
          const id = `room-${newId()}`;
          const room = validateRoom({ ...input, id });
          if (!room)
            throw new Error(
              "Add a palace name of up to 48 characters and choose a valid color and icon.",
            );
          if (
            get().rooms.some(
              (existing) =>
                existing.name.toLowerCase() === room.name.toLowerCase(),
            )
          )
            throw new Error(
              "A palace with this name already exists. Choose a different name.",
            );
          set((state) => ({
            rooms: [...state.rooms, room],
            activeRoomId: id,
            mode: "explore",
            selectedAnchorId: null,
            cameraTarget: null,
            isAddOpen: false,
            sessionRatings: {},
            cameraResetKey: state.cameraResetKey + 1,
          }));
          return id;
        },
        resetCamera: () =>
          set((state) => ({
            selectedAnchorId: null,
            cameraTarget: null,
            cameraResetKey: state.cameraResetKey + 1,
          })),
        addAnchor: (input) => {
          if (get().anchors.length >= 300)
            throw new Error(
              "Your palace is full. Remove an anchor before adding another.",
            );
          const id = newId();
          const anchor = validateAnchor(
            {
              ...input,
              id,
              status: "new",
              reviewCount: 0,
              lastReviewedAt: null,
            },
            new Set(get().rooms.map((room) => room.id)),
          );
          if (!anchor)
            throw new Error(
              "Check your anchor's title, color, room, and coordinates.",
            );
          set((state) => ({
            anchors: [...state.anchors, anchor],
            isAddOpen: false,
          }));
          return id;
        },
        updateAnchor: (id, updates) => {
          const original = get().anchors.find((anchor) => anchor.id === id);
          if (!original) return;
          const updated = validateAnchor(
            { ...original, ...updates, id },
            new Set(get().rooms.map((room) => room.id)),
          );
          if (!updated)
            throw new Error(
              "Check your anchor's title, color, room, and coordinates.",
            );
          set((state) => ({
            anchors: state.anchors.map((anchor) =>
              anchor.id === id ? updated : anchor,
            ),
            ...(state.selectedAnchorId === id
              ? updated.roomId === state.activeRoomId
                ? { cameraTarget: [...updated.position] as Vec3 }
                : { selectedAnchorId: null, cameraTarget: null }
              : {}),
          }));
        },
        deleteAnchor: (id) =>
          set((state) => {
            const sessionRatings = { ...state.sessionRatings };
            delete sessionRatings[id];
            return {
              anchors: state.anchors.filter((anchor) => anchor.id !== id),
              sessionRatings,
              ...(state.selectedAnchorId === id
                ? { selectedAnchorId: null, cameraTarget: null }
                : {}),
            };
          }),
        rateAnchor: (id, rating) => {
          if (!ratings.has(rating)) return;
          if (
            get().mode === "recall" &&
            Object.hasOwn(get().sessionRatings, id)
          )
            return;
          const anchor = get().anchors.find(
            (item) => item.id === id && item.roomId === get().activeRoomId,
          );
          if (!anchor) return;
          set((state) => ({
            anchors: state.anchors.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: rating === "easy" ? "mastered" : "learning",
                    reviewCount: Math.min(item.reviewCount + 1, 1_000_000),
                    lastReviewedAt: new Date().toISOString(),
                  }
                : item,
            ),
            sessionRatings: { ...state.sessionRatings, [id]: rating },
          }));
        },
        setAddOpen: (isAddOpen) => set({ isAddOpen }),
        toggleSound: () =>
          set((state) => ({ soundEnabled: !state.soundEnabled })),
        toggleEffects: () =>
          set((state) => ({ effectsEnabled: !state.effectsEnabled })),
      }),
      {
        name: PALACE_STORAGE_KEY,
        version: PALACE_STORAGE_VERSION,
        storage: options?.storage ?? browserStorage(),
        skipHydration: options?.skipHydration,
        partialize: ({
          rooms,
          anchors,
          activeRoomId,
          mode,
          soundEnabled,
          effectsEnabled,
        }) => ({
          rooms,
          anchors,
          activeRoomId,
          mode,
          soundEnabled,
          effectsEnabled,
        }),
        migrate: (persistedState) => validatePersistedState(persistedState),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(options?.memoryOnly
            ? {}
            : validatePersistedState(persistedState)),
        }),
      },
    ),
  );
}

/** Cloud sessions use memory only. Never persist one person's notes under a shared key. */
export const usePalaceStore = createPalaceStore({
  memoryOnly: true,
  skipHydration: true,
  storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});

export function workspaceData(
  state: PersistedPalaceState,
): PersistedPalaceState {
  const { rooms, anchors, activeRoomId, mode, soundEnabled, effectsEnabled } =
    state;
  return { rooms, anchors, activeRoomId, mode, soundEnabled, effectsEnabled };
}

export function replaceWorkspace(data: PersistedPalaceState) {
  usePalaceStore.setState({
    ...data,
    selectedAnchorId: null,
    cameraTarget: null,
    cameraResetKey: usePalaceStore.getState().cameraResetKey + 1,
    isAddOpen: false,
    sessionRatings: {},
  });
}

export function clearWorkspace() {
  replaceWorkspace({
    rooms: [],
    anchors: [],
    activeRoomId: "",
    mode: "explore",
    soundEnabled: false,
    effectsEnabled: true,
  });
}
