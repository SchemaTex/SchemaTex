import {
  INTERACTIVE_CAPABILITIES,
  INTERACTIVE_DIAGRAM_COUNT,
  POSITION_EDITABLE_DIAGRAM_COUNT,
} from 'schematex';

export const revalidate = false;

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export function GET() {
  return Response.json(
    {
      schemaVersion: 1,
      generatedFrom: 'schematex/INTERACTIVE_CAPABILITIES',
      counts: {
        diagrams: INTERACTIVE_DIAGRAM_COUNT,
        positionEditable: POSITION_EDITABLE_DIAGRAM_COUNT,
      },
      docs: {
        interactiveEditing: 'https://schematex.js.org/docs/interactive-editing',
        humanCapabilityMatrix:
          'https://github.com/SchemaTex/SchemaTex/blob/main/docs/system/INTERACTIVE-EDITING-CAPABILITIES.md',
      },
      capabilities: Object.values(INTERACTIVE_CAPABILITIES),
    },
    {
      headers: {
        'Cache-Control': CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
