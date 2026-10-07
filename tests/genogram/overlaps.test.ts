import { describe, expect, it } from 'vitest';
import { genogram } from '../../src/diagrams/genogram';
import { genogramOverlaps } from '../../scripts/visual-eval/genogram-overlaps.mts';

const symbol = (id: string, x: number) => `<g data-individual-id="${id}" transform="translate(${x} 20)"><rect class="schematex-genogram-shape" x="-20" y="-20" width="40" height="40"/></g>`;
const label = (text: string, x: number, y: number) => `<text class="schematex-genogram-label" x="${x}" y="${y}">${text}</text>`;

describe('emitted genogram overlap check', () => {
  it('counts symbols, labels and labels against symbols through nested translations', () => {
    const svg = `<svg><g transform="translate(200 100)">${symbol('a', 20)}${symbol('b', 40)}${label('Alice', 20, 25)}${label('Bea', 30, 25)}</g></svg>`;
    expect(genogramOverlaps(svg).counts).toEqual({ symbolSymbol: 1, labelLabel: 1, labelSymbol: 4 });
  });

  it('includes index borders and relationship captions, excludes titles and age numerals', () => {
    const svg = `<svg>${symbol('a', 20)}<g data-individual-id="b" transform="translate(65 20)"><circle class="schematex-genogram-shape" cx="0" cy="0" r="20"/><circle class="schematex-genogram-index-border" cx="0" cy="0" r="26"/></g><text class="schematex-genogram-edge-label" x="20" y="20" font-size="10">Marriage</text><text x="20" y="20" class="schematex-genogram-age">65</text><text x="20" y="20">Title</text></svg>`;
    expect(genogramOverlaps(svg).counts).toEqual({ symbolSymbol: 1, labelLabel: 0, labelSymbol: 2 });
  });

  it('resolves painted crowding after reordering and pins', () => {
    const svg = genogram.render(`genogram
  shared [female, label: "A very long shared parent name"]
  former [male]
  shared -x- former
    first_child [female, label: "A long first child name"]
  second [male]
  shared -x- second
    second_child [male, label: "A long second child name"]
  current [male]
  shared -- current
    third_child [female, label: "A long third child name"]`, {
      __pins: new Map([['shared', { x: 10, y: 0 }], ['former', { x: 10, y: 0 }]])
    });
    expect(genogramOverlaps(svg).counts).toEqual({ symbolSymbol: 0, labelLabel: 0, labelSymbol: 0 });
  });
});
