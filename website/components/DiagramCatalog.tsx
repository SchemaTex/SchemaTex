// "What can I draw?" catalog for the docs landing page — grouped by cluster,
// derived entirely from the package registry. Adding a diagram to
// DIAGRAM_REGISTRY makes it appear here automatically; no hand-maintained list.
import Link from 'next/link';
import { DIAGRAM_REGISTRY, type DiagramCluster, type DiagramMeta } from 'schematex/ai';
import { CLUSTERS_ORDERED, CLUSTER_DISPLAY } from '@/lib/clusters';

export function DiagramCatalog() {
  const byCluster = new Map<DiagramCluster, DiagramMeta[]>();
  for (const m of DIAGRAM_REGISTRY) {
    (byCluster.get(m.cluster) ?? byCluster.set(m.cluster, []).get(m.cluster)!).push(m);
  }

  const groups = CLUSTERS_ORDERED.map((cluster) => ({
    cluster,
    label: CLUSTER_DISPLAY[cluster].label,
    items: byCluster.get(cluster) ?? [],
  })).filter((g) => g.items.length > 0);

  return (
    <>
    <p>
      Schematex draws <strong>{DIAGRAM_REGISTRY.length}</strong> diagram types
      across <strong>{groups.length}</strong> domains — each built to a published
      standard:
    </p>
    <table>
      <thead>
        <tr>
          <th>Domain</th>
          <th>Diagrams</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g.cluster}>
            <td>
              <strong>{g.label}</strong>
            </td>
            <td>
              {g.items.map((m, i) => (
                <span key={m.type}>
                  {i > 0 && ', '}
                  <Link href={`/docs/${m.syntaxKey}`}>{m.name}</Link>
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </>
  );
}
