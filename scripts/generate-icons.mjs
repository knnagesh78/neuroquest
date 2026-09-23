import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";
await mkdir("public/icons", { recursive: true });
const logo = await readFile("src/app/icon.svg");
for (const [name, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["apple-touch-icon", 180],
]) {
  await sharp(logo).resize(size, size).png().toFile(`public/icons/${name}.png`);
}
const maskable = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#7955d9"/><g transform="translate(96 96) scale(5)"><path d="m32 12 18 10v21L32 53 14 43V22zm0 0v20m18-10L32 32 14 22m18 10v21" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="32" r="4" fill="#fff"/></g></svg>',
);
await sharp(maskable).png().toFile("public/icons/maskable-512.png");
