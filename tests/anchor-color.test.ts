import { describe, expect, it } from "vitest";
import {
  getAnchorDisplayColor,
  getAnchorDisplayColors,
} from "@/lib/anchor-color";

describe("anchor display colors", () => {
  it("refreshes colors saved from the earlier theme", () => {
    expect(getAnchorDisplayColor("#819178")).toBe("#8B5CF6");
    expect(getAnchorDisplayColor("#a78bfa")).toBe("#A855F7");
    expect(getAnchorDisplayColor("#fb923c")).toBe("#FB923C");
  });

  it("keeps vibrant palette colors and custom colors unchanged", () => {
    expect(getAnchorDisplayColor("#2DD4BF")).toBe("#2DD4BF");
    expect(getAnchorDisplayColor("#44aabb")).toBe("#44aabb");
  });

  it("gives existing anchors with the same old default color distinct neon accents", () => {
    expect(
      getAnchorDisplayColors([
        { color: "#b8ee83" },
        { color: "#b8ee83" },
        { color: "#b8ee83" },
      ]),
    ).toEqual(["#A855F7", "#FBBF24", "#EC4899"]);
  });

  it("keeps distinct saved colors distinct while refreshing their brightness", () => {
    expect(
      getAnchorDisplayColors([
        { color: "#8fae86" },
        { color: "#759b80" },
        { color: "#b8c2bc" },
      ]),
    ).toEqual(["#8B5CF6", "#2DD4BF", "#EC4899"]);
  });

  it("refreshes a single old default anchor with the new vivid color", () => {
    expect(getAnchorDisplayColors([{ color: "#b8ee83" }])).toEqual([
      "#A855F7",
    ]);
  });

  it("avoids repeating custom colors within a palace when possible", () => {
    expect(
      getAnchorDisplayColors([
        { color: "#44aabb" },
        { color: "#44aabb" },
      ]),
    ).toEqual(["#44aabb", "#FBBF24"]);
  });
});
