const REPO = 'victorzhrn/Schematex';
const NPM_PKG = 'schematex';
const REVALIDATE = 3600; // 1 hour

export interface RepoStats {
  stars: number;
  version: string;
}

export async function getRepoStats(): Promise<RepoStats> {
  const [ghRes, npmRes] = await Promise.allSettled([
    fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: REVALIDATE },
    }),
    fetch(`https://registry.npmjs.org/${NPM_PKG}/latest`, {
      next: { revalidate: REVALIDATE },
    }),
  ]);

  let stars = 0;
  if (ghRes.status === 'fulfilled' && ghRes.value.ok) {
    const data = await ghRes.value.json();
    stars = data.stargazers_count ?? 0;
  }

  let version = '0.1.1';
  if (npmRes.status === 'fulfilled' && npmRes.value.ok) {
    const data = await npmRes.value.json();
    version = data.version ?? version;
  }

  return { stars, version };
}

export function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
