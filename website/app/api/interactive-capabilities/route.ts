import { INTERACTIVE_DIAGRAM_COUNT, POSITION_EDITABLE_DIAGRAM_COUNT } from 'schematex';
import { listDiagrams } from 'schematex/ai';

export const revalidate = false;

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export function GET() {
  const all = listDiagrams();
  const sourceOnly = all
    .filter((entry) => entry.interactive.text.length === 0)
    .map((entry) => ({
      type: entry.type,
      name: entry.name,
      reason: entry.interactive.reason,
    }));
  return Response.json(
    {
      schemaVersion: 3,
      generatedFrom: 'schematex/getInteractiveCapabilities',
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
      capabilities: all.map((entry) => ({
        name: entry.name,
        standard: entry.standard,
        ...entry.interactive,
      })),
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
