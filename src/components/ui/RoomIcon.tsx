import {
  BookOpen,
  Code2,
  FlaskConical,
  Globe2,
  HeartPulse,
  Landmark,
} from "lucide-react";
import type { RoomIcon as RoomIconName } from "@/lib/types";

export const ROOM_ICON_OPTIONS = [
  { value: "book", label: "General", Icon: BookOpen },
  { value: "cpu", label: "Technology", Icon: Code2 },
  { value: "heart", label: "Biology", Icon: HeartPulse },
  { value: "landmark", label: "History", Icon: Landmark },
  { value: "flask", label: "Science", Icon: FlaskConical },
  { value: "globe", label: "Languages", Icon: Globe2 },
] as const;

export default function RoomIcon({
  icon,
  size = 16,
}: {
  icon: RoomIconName;
  size?: number;
}) {
  const Icon =
    ROOM_ICON_OPTIONS.find((choice) => choice.value === icon)?.Icon ?? BookOpen;
  return <Icon size={size} />;
}
