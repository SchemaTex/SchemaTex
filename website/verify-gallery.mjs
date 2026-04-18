import { galleryExamples } from './lib/gallery-examples.ts';
import { render } from 'schematex';
let ok = 0, fail = 0;
for (const ex of galleryExamples) {
  try {
    const svg = render(ex.dsl);
    if (!svg || !svg.includes('<svg')) throw new Error('no svg returned');
    ok++;
  } catch (e) {
    fail++;
    console.error(`FAIL ${ex.slug}: ${e.message}`);
  }
}
console.log(`OK: ${ok}/${galleryExamples.length}, FAIL: ${fail}`);
