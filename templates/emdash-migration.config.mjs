/**
 * Project-owned migration policy for a WordPress to EmDash port.
 *
 * These are decisions the project owner should make explicitly rather than
 * defaults an agent applies silently. Each one changes what a reader or a
 * crawler sees.
 *
 * Copy into the project and reference it from the generators and verifiers.
 */

export default {
  /* ---------------------------------------------------------------------- */
  /* Routing                                                                */
  /* ---------------------------------------------------------------------- */

  routing: {
    /**
     * Reproduce the source permalink structure exactly. Changing it means
     * redirecting the whole archive, which spends link equity for nothing.
     */
    permalink: '/:year/:month/:day/:slug/',
    trailingSlash: 'always',
    postsPerPage: 10,

    /** Timezone the source published in. Permalinks are derived in it. */
    timezone: 'America/New_York',

    /**
     * Redirect the `page/1` form of every archive to its base route. The source
     * platform served both; inheriting that duplication is a choice.
     */
    collapseFirstPage: true,

    /**
     * Return 404 beyond the end of an archive rather than an empty 200. An
     * empty deep page that answers 200 is thin content a crawler will index.
     */
    notFoundBeyondLastPage: true,

    /** Slugs that must never be used by a page, because they shadow routes. */
    reservedSlugs: ['page', 'category', 'tag', 'author', 'search', 'feed'],
  },

  /* ---------------------------------------------------------------------- */
  /* Taxonomy policy                                                        */
  /* ---------------------------------------------------------------------- */

  taxonomy: {
    /**
     * Archives at or below this post count are marked noindex and excluded from
     * the sitemap, while remaining reachable and linked.
     *
     * The default is 0, meaning only genuinely empty archives are suppressed.
     *
     * Do not raise this without traffic data for the `/tag/` path family. The
     * intuition that a one-post archive is worthless is frequently wrong on
     * publications that cover named entities: those archives rank for proper
     * nouns and are the aggregation point a searcher wants. On the reference
     * migration, roughly ninety percent of tag-archive traffic came from
     * archives that a threshold of 3 would have suppressed.
     */
    thinArchiveThreshold: 0,

    /** Emit noindex at or below the threshold. */
    noindexThinArchives: true,

    /** Exclude the same archives from the sitemap. Advertising noindex pages is an error. */
    excludeThinArchivesFromSitemap: true,

    /**
     * Render excerpts rather than full post bodies on tag archives. This is the
     * better answer to archive duplication than deindexing, because it removes
     * the duplicate text while keeping the archive's own ranking. Only relevant
     * when the source theme rendered full content on archives.
     */
    excerptsOnTagArchives: false,
  },

  /* ---------------------------------------------------------------------- */
  /* Media                                                                  */
  /* ---------------------------------------------------------------------- */

  media: {
    /**
     * Leave migrated media on its existing object storage, or copy it to the
     * target platform's storage. Leaving it avoids re-uploading the library and
     * invalidating every indexed image URL.
     */
    strategy: 'reference-existing',

    /** Largest delivery width to select from the source's generated variants. */
    maxDeliveryWidth: 1600,

    /**
     * Only these variants are eligible. Sites that have changed themes carry
     * hard-cropped variants from themes they no longer run; selecting one
     * silently recomposes the image and passes every automated check.
     */
    allowedVariants: ['large', 'medium_large', 'medium', 'thumbnail'],

    /** Fail the build if more than this many attachments lack a usable variant. */
    maxOversizedOriginals: 25,
  },

  /* ---------------------------------------------------------------------- */
  /* Redirects                                                              */
  /* ---------------------------------------------------------------------- */

  redirects: {
    /** Cloudflare's static redirect file limit. Overflow goes to middleware. */
    edgeRuleLimit: 2100,

    /** Lower rank is emitted first when the budget is contested. */
    priority: { structural: 0, legacyPlugin: 1, other: 2, shortlink: 3 },

    /**
     * Drop legacy rules that are vulnerability probes rather than real URLs.
     * A 404-redirect plugin records every URL that ever failed, and on a public
     * site most of them are scanners.
     */
    dropProbePatterns: true,

    /** Removed platform endpoints answer 410, which stops crawler retries. */
    goneEndpoints: ['/wp-admin/*', '/wp-login.php', '/xmlrpc.php', '/wp-json/*'],
  },

  /* ---------------------------------------------------------------------- */
  /* Verification                                                           */
  /* ---------------------------------------------------------------------- */

  verification: {
    /** Articles probed in the online parity pass. Sampled at a fixed stride. */
    routeSampleSize: 250,

    /** Resolved media URLs sampled and required to return 200. */
    mediaSampleSize: 20,

    /** Generators must produce byte-identical output across two runs. */
    requireDeterministicGenerators: true,

    /** These make content unreachable under slug-resolved routing. */
    failOnDuplicateSlugs: true,
    failOnReservedSlugCollision: true,
  },
};
