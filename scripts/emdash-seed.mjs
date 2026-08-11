#!/usr/bin/env node
/**
 * emdash-seed.mjs
 *
 * Converts the platform-neutral dataset produced by wp-extract.mjs into an
 * EmDash seed file plus a bulk-content payload.
 *
 * EmDash inlines seed/seed.json into the build, so it is the right home for
 * schema, settings, taxonomies, menus, widget areas and a small number of
 * singular pages. It is the wrong home for several thousand articles. Bulk
 * content is therefore emitted separately as NDJSON for emdash-import.mjs.
 *
 * Usage:
 *   node emdash-seed.mjs --dataset ./dataset --out ./site
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { htmlToPortableText } from '@emdash-cms/gutenberg-to-portable-text';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    args[key] = !next || next.startsWith('--') ? true : next;
    if (args[key] !== true) i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const datasetDir = args.dataset || './dataset';
const outDir = args.out || './site';

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(datasetDir, file), 'utf8'));
const readNdjson = (file) =>
  fs
    .readFileSync(path.join(datasetDir, file), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const site = readJson('site.json');
const categories = readJson('categories.json');
const tags = readJson('tags.json');
const authors = readJson('authors.json');
const menus = readJson('menus.json');
const posts = readNdjson('posts.ndjson');
const pages = readNdjson('pages.ndjson');
const media = readNdjson('media.ndjson');

fs.mkdirSync(path.join(outDir, 'seed'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'content'), { recursive: true });

const mediaById = new Map(media.map((m) => [m.id, m]));

/* -------------------------------------------------------------------------- */
/* Deterministic Portable Text                                                */
/* -------------------------------------------------------------------------- */

/**
 * The upstream converter generates random block keys. Random keys make every
 * re-run produce a different payload, which defeats idempotent imports and
 * makes diffing two migration runs impossible. This rewrites every key to a
 * stable value derived from the document identity and the node's position,
 * remapping markDefs references as it goes.
 */
function stabilizeKeys(blocks, seed) {
  let counter = 0;
  const nextKey = () => {
    counter += 1;
    return crypto
      .createHash('sha1')
      .update(`${seed}:${counter}`)
      .digest('hex')
      .slice(0, 12);
  };

  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;

    const out = { ...node };
    const remap = new Map();

    if (Array.isArray(out.markDefs)) {
      out.markDefs = out.markDefs.map((def) => {
        const replacement = nextKey();
        if (def._key) remap.set(def._key, replacement);
        return { ...def, _key: replacement };
      });
    }

    if (Array.isArray(out.children)) {
      out.children = out.children.map((child) => {
        const next = { ...child, _key: nextKey() };
        if (Array.isArray(next.marks)) {
          next.marks = next.marks.map((mark) => remap.get(mark) ?? mark);
        }
        return next;
      });
    }

    for (const [key, value] of Object.entries(out)) {
      if (key === 'children' || key === 'markDefs') continue;
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        out[key] = walk(value);
      }
    }

    out._key = nextKey();
    return out;
  };

  return blocks.map(walk);
}

/**
 * Points every Portable Text image block at the media library record rather
 * than a bare URL, so the CMS can manage the asset after import instead of
 * treating it as an opaque external reference.
 */
function bindImageAssets(blocks) {
  const byUrl = new Map(media.map((m) => [m.url, m]));
  const bySourcePath = new Map(media.map((m) => [m.sourcePath, m]));

  const resolve = (url) => {
    if (!url) return null;
    if (byUrl.has(url)) return byUrl.get(url);
    try {
      const pathname = decodeURI(new URL(url).pathname).replace(/^\//, '');
      if (bySourcePath.has(pathname)) return bySourcePath.get(pathname);
      // Size variants share a stem with the original: name-1024x683.jpg
      const stripped = pathname.replace(/-\d+x\d+(\.\w+)$/, '$1');
      if (bySourcePath.has(stripped)) return bySourcePath.get(stripped);
    } catch {
      /* not an absolute URL */
    }
    return null;
  };

  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    if (node._type === 'image' && node.asset?.url) {
      const item = resolve(node.asset.url);
      if (item) {
        return {
          ...node,
          asset: {
            _type: 'reference',
            _ref: `legacy-media-${item.id}`,
            url: item.url,
          },
          alt: node.alt || item.alt || '',
          width: item.width ?? undefined,
          height: item.height ?? undefined,
        };
      }
    }
    const out = { ...node };
    for (const [key, value] of Object.entries(out)) {
      if (Array.isArray(value) || (value && typeof value === 'object')) out[key] = walk(value);
    }
    return out;
  };

  return blocks.map(walk);
}

function toPortableText(html, seed) {
  const blocks = htmlToPortableText(html);
  return stabilizeKeys(bindImageAssets(blocks), seed);
}

/* -------------------------------------------------------------------------- */
/* Media reference helper                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Picks the largest generated variant at or below the delivery width instead
 * of the original upload. Source images in this corpus reach 8256 pixels wide,
 * which no responsive image budget survives.
 */
const OVERSIZED_ORIGINALS = [];

/**
 * Only WordPress core sizes are considered. This library also carries `td_*`
 * variants left behind by a previously installed magazine theme, and those are
 * hard-cropped to fixed aspect ratios: selecting one would silently recompose
 * a portrait photograph into a letterbox.
 */
const CORE_SIZES = ['large', 'medium_large', 'medium', 'thumbnail'];

function deliveryImage(item, maxWidth = 1600) {
  if (!item) return null;
  const candidates = CORE_SIZES.map((name) => item.sizes?.[name])
    .filter((size) => size?.width && size.width <= maxWidth)
    .sort((a, b) => b.width - a.width);
  const chosen = candidates[0];
  if (chosen) {
    return { url: chosen.file, width: chosen.width, height: chosen.height };
  }
  if ((item.width ?? 0) > maxWidth) {
    OVERSIZED_ORIGINALS.push({ id: item.id, width: item.width, url: item.url });
  }
  return { url: item.url, width: item.width, height: item.height };
}

function mediaField(item) {
  if (!item) return null;
  const delivery = deliveryImage(item);
  return {
    $media: {
      url: delivery.url,
      alt: item.alt || '',
      filename: path.posix.basename(item.sourcePath),
      width: delivery.width ?? undefined,
      height: delivery.height ?? undefined,
      caption: item.caption || undefined,
      legacyId: item.id,
      originalUrl: item.url,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Fields carrying migration identity. `legacy_id` makes re-imports idempotent
 * and `legacy_route` lets the route builder reproduce the exact WordPress
 * permalink without re-deriving it from a date at render time.
 */
const migrationFields = [
  { slug: 'legacy_id', label: 'Legacy WordPress ID', type: 'integer' },
  { slug: 'legacy_route', label: 'Legacy Permalink', type: 'string' },
  { slug: 'published_at', label: 'Published At', type: 'datetime' },
  { slug: 'updated_at', label: 'Updated At', type: 'datetime' },
];

const seoFields = [
  { slug: 'seo_title', label: 'SEO Title', type: 'string' },
  { slug: 'seo_description', label: 'Meta Description', type: 'text' },
  { slug: 'seo_canonical', label: 'Canonical URL', type: 'string' },
  { slug: 'seo_noindex', label: 'No Index', type: 'boolean' },
  { slug: 'og_title', label: 'Open Graph Title', type: 'string' },
  { slug: 'og_description', label: 'Open Graph Description', type: 'text' },
  { slug: 'og_image', label: 'Open Graph Image', type: 'string' },
];

const seed = {
  $schema: 'https://emdashcms.com/seed.schema.json',
  version: '1',
  meta: {
    name: site.name,
    description: site.description,
    author: site.name,
  },
  settings: {
    title: site.name,
    tagline: site.description,
  },
  collections: [
    {
      slug: 'posts',
      label: 'Posts',
      labelSingular: 'Post',
      supports: ['drafts', 'revisions', 'search', 'seo'],
      commentsEnabled: true,
      fields: [
        { slug: 'title', label: 'Title', type: 'string', required: true, searchable: true },
        { slug: 'featured_image', label: 'Featured Image', type: 'image' },
        { slug: 'content', label: 'Content', type: 'portableText', searchable: true },
        { slug: 'excerpt', label: 'Excerpt', type: 'text', searchable: true },
        { slug: 'reading_time', label: 'Reading Time (minutes)', type: 'integer' },
        { slug: 'legacy_comment_count', label: 'Legacy Comment Count', type: 'integer' },
        ...migrationFields,
        ...seoFields,
      ],
    },
    {
      slug: 'pages',
      label: 'Pages',
      labelSingular: 'Page',
      supports: ['drafts', 'revisions', 'search', 'seo'],
      fields: [
        { slug: 'title', label: 'Title', type: 'string', required: true, searchable: true },
        { slug: 'content', label: 'Content', type: 'portableText', searchable: true },
        { slug: 'excerpt', label: 'Excerpt', type: 'text' },
        { slug: 'menu_order', label: 'Menu Order', type: 'integer' },
        ...migrationFields,
        ...seoFields,
      ],
    },
  ],
  taxonomies: [
    {
      name: 'category',
      label: 'Categories',
      labelSingular: 'Category',
      hierarchical: true,
      collections: ['posts'],
      terms: categories.map((category) => ({
        slug: category.slug,
        label: category.name,
        description: category.description || undefined,
        parent: category.parentId
          ? categories.find((c) => c.id === category.parentId)?.slug
          : undefined,
      })),
    },
    {
      name: 'tag',
      label: 'Tags',
      labelSingular: 'Tag',
      hierarchical: false,
      collections: ['posts'],
      terms: tags.map((tag) => ({
        slug: tag.slug,
        label: tag.name,
        description: tag.description || undefined,
      })),
    },
  ],
  bylines: authors.map((author) => ({
    id: `byline-${author.slug}`,
    slug: author.slug,
    displayName: author.name,
    bio: author.bio || undefined,
    url: author.url || undefined,
  })),
  menus: menus
    .filter((menu) => menu.items.length > 0)
    .map((menu) => ({
      name: menu.slug,
      label: menu.name,
      items: buildMenuTree(menu.items),
    })),
  widgetAreas: [
    {
      name: 'sidebar',
      label: 'Primary Sidebar',
      description: 'Right-hand sidebar shown on the home page, archives and single posts',
      widgets: [
        { type: 'component', componentId: 'core:search', title: 'Search' },
        {
          type: 'component',
          componentId: 'core:recent-posts',
          title: 'Recent Posts',
          settings: { count: 5, showDate: true },
        },
        { type: 'component', componentId: 'core:categories', title: 'Categories' },
        {
          type: 'component',
          componentId: 'core:archives',
          title: 'Archives',
          settings: { type: 'monthly', limit: 12 },
        },
      ],
    },
    {
      name: 'footer',
      label: 'Footer',
      description: 'Footer widget area',
      widgets: [],
    },
  ],
  content: {
    pages: pages.map((page) => toContentEntry(page, 'page')),
  },
};

function buildMenuTree(items) {
  const byId = new Map(items.map((item) => [item.id, { ...item, children: [] }]));
  const roots = [];
  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId).children.push(item);
    } else {
      roots.push(item);
    }
  }
  const shape = (item) => {
    const node = { type: 'custom', label: item.label, url: item.url || '/' };
    if (item.children.length) node.children = item.children.map(shape);
    return node;
  };
  return roots.map(shape);
}

function toContentEntry(doc, kind) {
  const seedKey = `${kind}-${doc.id}`;
  const featured = doc.featuredImage ? mediaById.get(doc.featuredImage.id) : null;

  const data = {
    title: doc.title,
    content: toPortableText(doc.contentHtml, seedKey),
    excerpt: doc.excerpt,
    legacy_id: doc.id,
    legacy_route: doc.route,
    published_at: doc.publishedAt,
    updated_at: doc.updatedAt,
    seo_title: doc.seo?.title ?? null,
    seo_description: doc.seo?.description ?? null,
    seo_canonical: doc.seo?.canonical ?? null,
    seo_noindex: Boolean(doc.seo?.noindex),
    og_title: doc.seo?.openGraph?.title ?? null,
    og_description: doc.seo?.openGraph?.description ?? null,
    og_image: doc.seo?.openGraph?.image ?? null,
  };

  if (kind === 'post') {
    data.featured_image = mediaField(featured);
    data.reading_time = doc.readingTimeMinutes;
    data.legacy_comment_count = doc.commentCount;
  } else {
    data.menu_order = doc.menuOrder;
  }

  const entry = {
    id: `legacy-${kind}-${doc.id}`,
    slug: doc.slug,
    status: 'published',
    data,
  };

  if (kind === 'post') {
    entry.bylines = doc.author ? [{ byline: `byline-${doc.author.slug}` }] : [];
    entry.taxonomies = {
      category: doc.categories.map((c) => c.slug),
      tag: doc.tags.map((t) => t.slug),
    };
  }

  return entry;
}

/* -------------------------------------------------------------------------- */
/* Emit                                                                       */
/* -------------------------------------------------------------------------- */

console.log(`Converting ${posts.length} posts to Portable Text`);

const postEntries = [];
let converted = 0;
for (const post of posts) {
  postEntries.push(toContentEntry(post, 'post'));
  converted += 1;
  if (converted % 500 === 0) console.log(`  ${converted}/${posts.length}`);
}

fs.writeFileSync(path.join(outDir, 'seed', 'seed.json'), `${JSON.stringify(seed, null, '\t')}\n`);

const bulkStream = fs.createWriteStream(path.join(outDir, 'content', 'posts.ndjson'));
for (const entry of postEntries) bulkStream.write(`${JSON.stringify(entry)}\n`);
bulkStream.end();

const mediaStream = fs.createWriteStream(path.join(outDir, 'content', 'media.ndjson'));
for (const item of media) {
  mediaStream.write(
    `${JSON.stringify({
      id: `legacy-media-${item.id}`,
      legacyId: item.id,
      url: item.url,
      filename: path.posix.basename(item.sourcePath),
      alt: item.alt,
      caption: item.caption,
      mimeType: item.mimeType,
      width: item.width,
      height: item.height,
      sizes: item.sizes,
      uploadedAt: item.uploadedAt,
      external: true,
      storage: item.storage,
    })}\n`,
  );
}
mediaStream.end();

fs.writeFileSync(
  path.join(outDir, 'content', 'oversized-originals.json'),
  `${JSON.stringify(
    {
      note:
        'These attachments have no core size variant at or below the delivery width, so the ' +
        'original is served. Regenerate thumbnails on the source before cutover, or the ' +
        'performance gate will fail on any page that references them.',
      count: OVERSIZED_ORIGINALS.length,
      items: OVERSIZED_ORIGINALS,
    },
    null,
    2,
  )}\n`,
);

const seedBytes = fs.statSync(path.join(outDir, 'seed', 'seed.json')).size;
console.log(
  `Wrote seed.json (${(seedBytes / 1024).toFixed(0)} KB, schema + ${pages.length} pages + ` +
    `${categories.length} categories + ${tags.length} tags + ${authors.length} bylines)`,
);
console.log(`Wrote content/posts.ndjson (${postEntries.length} posts)`);
console.log(`Wrote content/media.ndjson (${media.length} media records)`);
