export type StudyMode = "explore" | "recall";
export type Retention = "new" | "learning" | "mastered";
export type Rating = "easy" | "hard" | "failed";
export type AnchorShape =
  | "crystal"
  | "torus"
  | "cube"
  | "sphere"
  | "pyramid"
  | "knot";
export type Vec3 = [number, number, number];

export interface MemoryAnchor {
  id: string;
  roomId: string;
  title: string;
  category: string;
  content: string;
  color: string;
  position: Vec3;
  shape: AnchorShape;
  artifactType: "preset" | "ai-3d";
  modelUrl?: string;
  thumbnailUrl?: string;
  isGenerating?: boolean;
  recallPrompt?: string;
  status: Retention;
  reviewCount: number;
  lastReviewedAt: string | null;
}

export type RoomIcon =
  | "cpu"
  | "heart"
  | "landmark"
  | "book"
  | "flask"
  | "globe";

export interface Room {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  icon: RoomIcon;
}

export type NewRoomInput = Omit<Room, "id">;

export type NewAnchorInput = Omit<
  MemoryAnchor,
  "id" | "status" | "reviewCount" | "lastReviewedAt" | "artifactType"
> & { artifactType?: MemoryAnchor["artifactType"] };

export type AnchorUpdate = Partial<Omit<MemoryAnchor, "id">>;
