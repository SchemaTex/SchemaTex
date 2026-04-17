import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "diagrams/genogram/index": "src/diagrams/genogram/index.ts",
    "diagrams/ecomap/index": "src/diagrams/ecomap/index.ts",
    "diagrams/pedigree/index": "src/diagrams/pedigree/index.ts",
    "diagrams/phylo/index": "src/diagrams/phylo/index.ts",
    "diagrams/sociogram/index": "src/diagrams/sociogram/index.ts",
    "diagrams/timing/index": "src/diagrams/timing/index.ts",
    "diagrams/logic/index": "src/diagrams/logic/index.ts",
    "diagrams/circuit/index": "src/diagrams/circuit/index.ts",
    "diagrams/blockdiagram/index": "src/diagrams/blockdiagram/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false, // keep readable for open-source
});
