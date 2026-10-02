export const roomPalette = [
  { value: "#A77C5B", label: "Cocoa" },
  { value: "#795039", label: "Chocolate" },
  { value: "#C9A77C", label: "Caramel" },
  { value: "#E4C9A5", label: "Cream" },
  { value: "#A96645", label: "Terracotta" },
  { value: "#b85024", label: "Burnt orange" },
] as const;

const previousRoomColors: Readonly<Record<string, string>> = {
  "#819178": "#A77C5B",
  "#61735d": "#795039",
  "#a9b5a1": "#C9A77C",
  "#888c84": "#A96645",
  "#b5b4aa": "#E4C9A5",
  "#b45e38": "#b85024",
  "#8fae86": "#C9A77C",
  "#759b80": "#A77C5B",
  "#d6814f": "#b85024",
};

export function getRoomDisplayColor(color: string): string {
  return previousRoomColors[color.toLowerCase()] ?? color;
}
