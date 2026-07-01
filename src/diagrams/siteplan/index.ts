import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parseSiteplan } from "./parser";
import { layoutSiteplan } from "./layout";
import { renderSiteplan } from "./renderer";

export const siteplan: DiagramPlugin = {
  type: "siteplan" as DiagramPlugin["type"],
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t || t.startsWith("#") || t.startsWith("//")) continue;
      return /^(siteplan|plotplan|parcelmap|propertymap)\b/i.test(t);
    }
    return false;
  },
  parse: parseSiteplan,
  render(text: string, config?: RenderConfig): string {
    return renderSiteplan(text, config);
  },
  lint(text: string): SchematexDiagnostic[] {
    try {
      const lay = layoutSiteplan(parseSiteplan(text));
      return lay.warnings.map((message) => ({
        severity: "warning",
        code: "siteplan/warning",
        message,
        fatal: false,
      }));
    } catch {
      return [];
    }
  },
};

export { parseSiteplan, SiteplanParseError } from "./parser";
export { layoutSiteplan, formatSiteLength } from "./layout";
export { renderSiteplan, renderSiteplanLayout } from "./renderer";
export type * from "./types";
