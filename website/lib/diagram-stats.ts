// Single source of truth for "how many diagram types does Schematex ship".
// Derived from the package registry so marketing copy can never drift again.
import { getAllDiagramTypes } from 'schematex/ai';

export const DIAGRAM_TYPE_COUNT = getAllDiagramTypes().length;
