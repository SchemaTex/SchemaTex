import { readFile, writeFile } from "node:fs/promises";

const outputs = ["dist/react.js", "dist/react.cjs"];

await Promise.all(outputs.map(async (file) => {
  const source = await readFile(file, "utf8");
  if (source.startsWith('"use client";') || source.startsWith("'use client';")) return;
  await writeFile(file, `"use client";\n${source}`);
}));
