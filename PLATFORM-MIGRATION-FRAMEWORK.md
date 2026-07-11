# Platform-Agnostic Astro Migration Framework

## Goal

This framework adapts the Webflow process to any source platform. The extraction mechanism changes, but the evidence and acceptance model remains stable.

Maturity note: only the Webflow and WordPress paths have been exercised on real production migrations. The rows below for Squarespace, Wix, Drupal, static HTML, and custom content management systems are alpha implementations. They describe the expected shape of each migration but have not been proven end to end. Validate each step against the actual platform and report corrections.

Every platform adapter and migration workflow must preserve the mandatory production gate in [PRODUCTION-RELEASE-POLICY.md](PRODUCTION-RELEASE-POLICY.md). The built candidate must pass native iOS Safari Simulator testing and must receive 100 for Performance, Accessibility, Best Practices, and SEO in PageSpeed Insights for both mobile and desktop before production.

## Source Platform Matrix

| Source | Primary exports | Common hidden dependencies | Migration emphasis |
|---|---|---|---|
| Webflow | ZIP, CMS CSV, API, DevLink | Generated classes, interactions, hosted assets | Component extraction, CMS mapping, CSS ownership |
| WordPress | REST API, XML, database, media uploads | Shortcodes, plugins, theme templates | Content normalization, redirects, media and SEO metadata |
| Squarespace | XML, page HTML, hosted assets | Blocks, commerce, forms | Block mapping, asset capture, form replacement |
| Wix | API, CSV, rendered pages | Velo code, dynamic datasets | Route discovery, data export, interaction replacement |
| Drupal | JSON:API, database, files | Views, modules, field configuration | Content-type schemas, taxonomy, redirects |
| Static HTML | Files and assets | Inline scripts, server rules | Route inventory, component extraction, metadata cleanup |
| Custom CMS | API, database, templates | Undocumented fields and business rules | Contract discovery, repeatable exporter, validation |

## Invariant Migration Tracks

Every source should be handled through these tracks:

1. Source capture and archive.
2. Route and redirect inventory.
3. Content model and publication-state mapping.
4. Asset discovery and localization.
5. Design token and component extraction.
6. Interaction replacement.
7. Forms and backend integration.
8. Metadata, structured data, and discovery.
9. Responsive and visual parity.
10. Accessibility.
11. WebKit and native Safari testing.
12. Performance and build optimization.
13. Staging and production verification.

## Adapter Contract

A source-platform adapter should emit a common intermediate model:

```ts
interface MigratedPage {
  route: string;
  legacyUrls: string[];
  kind: string;
  title: string;
  description?: string;
  sections: MigratedSection[];
  assets: MigratedAssetReference[];
  seo?: MigratedSeo;
  source: SourceEvidence;
}
```

The adapter should also emit:

- Asset manifest.
- Redirect map.
- Duplicate report.
- Skipped-record report.
- Unsupported-structure report.
- Source evidence links or file references.

This keeps platform-specific extraction separate from Astro component rendering.

## Contribution Opportunity

Future contributors can add:

- Platform adapters.
- Example content schemas.
- Asset downloaders.
- Redirect generators.
- Metadata normalizers.
- Playwright route-audit helpers.
- Visual comparison tools.
- Cloud deployment examples.
- Case studies with measured results.

Adapters should avoid site-specific secrets and should include fixtures or synthetic examples that can be shared publicly.
