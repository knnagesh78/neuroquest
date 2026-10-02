export const anchorPalette = [
  { value: "#FBBF24", label: "Electric amber" },
  { value: "#A855F7", label: "Neon violet" },
  { value: "#EC4899", label: "Hot pink" },
  { value: "#2DD4BF", label: "Aqua teal" },
  { value: "#60A5FA", label: "Electric blue" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#FB923C", label: "Neon orange" },
  { value: "#22D3EE", label: "Cyan" },
  { value: "#F472B6", label: "Rose pink" },
  { value: "#E879F9", label: "Fuchsia" },
] as const;

const refreshedAnchorColors: Readonly<Record<string, string>> = {
  // Preserve each saved anchor while giving older sage/concrete swatches the
  // vibrant color language now used by the 3D artifacts.
  "#819178": "#8B5CF6",
  "#61735d": "#2DD4BF",
  "#a9b5a1": "#60A5FA",
  "#888c84": "#EC4899",
  "#b5b4aa": "#FBBF24",
  "#b45e38": "#FB923C",
  "#b8ee83": "#A855F7",
  "#72d697": "#2DD4BF",
  "#9fbe94": "#60A5FA",
  "#cbd4ce": "#EC4899",
  "#dfd4c3": "#FBBF24",
  "#f07845": "#FB923C",
  "#f1b76a": "#FBBF24",
  "#81c58b": "#2DD4BF",
  "#9b78ef": "#A855F7",
  "#a78bfa": "#A855F7",
  "#5eead4": "#2DD4BF",
  "#78bba3": "#22D3EE",
  "#2dd4bf": "#2DD4BF",
  "#fbbf24": "#FBBF24",
  "#e6af57": "#FBBF24",
  "#f472b6": "#F472B6",
  "#e58eaa": "#EC4899",
  "#fb7185": "#F43F5E",
  "#60a5fa": "#60A5FA",
  "#73a8e3": "#60A5FA",
  "#7dd3fc": "#22D3EE",
  "#a2a5bf": "#8B5CF6",
  "#c084fc": "#A855F7",
  "#fb923c": "#FB923C",
  "#8fae86": "#8B5CF6",
  "#759b80": "#2DD4BF",
  "#a5b8a1": "#60A5FA",
  "#b8c2bc": "#EC4899",
  "#d2c6b3": "#FBBF24",
  "#e0b36e": "#FBBF24",
  "#d6814f": "#FB923C",
};

export function getAnchorDisplayColor(color: string): string {
  return refreshedAnchorColors[color.toLowerCase()] ?? color;
}

export function getAnchorDisplayColors(
  anchors: ReadonlyArray<{ color: string }>,
): string[] {
  const used = new Set<string>();

  return anchors.map((anchor) => {
    const preferred = getAnchorDisplayColor(anchor.color);
    if (!used.has(preferred.toLowerCase())) {
      used.add(preferred.toLowerCase());
      return preferred;
    }

    const distinct = anchorPalette.find(
      (swatch) => !used.has(swatch.value.toLowerCase()),
    )?.value;
    const next = distinct ?? preferred;
    used.add(next.toLowerCase());
    return next;
  });
}
