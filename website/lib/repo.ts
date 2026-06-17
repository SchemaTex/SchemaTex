// Single source of truth for the GitHub repo identity.
//
// The repo was renamed/transferred: `victorzhrn/Schematex` now 301-redirects
// to the canonical `SchemaTex/SchemaTex` (matches `git remote`). Every link in
// the site MUST point at the canonical slug — redirects look unprofessional and
// can drop referrer/UTM tracking. Import from here; never hardcode the slug.
export const REPO_SLUG = 'SchemaTex/SchemaTex';
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
