import {
  INTERACTIVE_CAPABILITIES,
  INTERACTIVE_DIAGRAM_COUNT,
  POSITION_EDITABLE_DIAGRAM_COUNT,
} from 'schematex';
import { listDiagrams } from 'schematex/ai';

export const revalidate = false;

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export function GET() {
  const all = listDiagrams();
  const sourceOnly = all
    .filter((entry) => entry.interactive.text.length === 0)
    .map((entry) => ({ type: entry.type, name: entry.name }));
  return Response.json(
    {
      schemaVersion: 2,
      generatedFrom: 'schematex/INTERACTIVE_CAPABILITIES',
      counts: {
        totalDiagrams: all.length,
        canvasEditable: INTERACTIVE_DIAGRAM_COUNT,
        positionEditable: POSITION_EDITABLE_DIAGRAM_COUNT,
        sourceOnly: sourceOnly.length,
      },
      docs: {
        interactiveEditing: 'https://schematex.js.org/docs/interactive-editing',
        humanCapabilityMatrix:
          'https://github.com/SchemaTex/SchemaTex/blob/main/docs/system/INTERACTIVE-EDITING-CAPABILITIES.md',
      },
      capabilities: Object.values(INTERACTIVE_CAPABILITIES),
      sourceOnly,
    },
    {
      headers: {
        'Cache-Control': CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
