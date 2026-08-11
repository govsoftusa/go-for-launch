#!/usr/bin/env node
/**
 * wp-extract.mjs
 *
 * Extracts a WordPress site into a platform-neutral intermediate dataset that
 * can be imported into an Astro CMS (EmDash) or any other target.
 *
 * The output implements the Go for Launch adapter contract described in
 * PLATFORM-MIGRATION-FRAMEWORK.md: a set of MigratedPage records plus an asset
 * manifest, redirect map, duplicate report, skipped-record report and
 * unsupported-structure report.
 *
 * This script never writes to the source database. It only reads.
 *
 * Usage:
 *   node wp-extract.mjs --config wp-extract.config.json --out ./dataset
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import mysql from 'mysql2/promise';

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const configPath = args.config || 'wp-extract.config.json';
const outDir = args.out || './dataset';

if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const prefix = config.tablePrefix ?? 'wp_';
const T = (name) => `\`${prefix}${name}\``;

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'reports'), { recursive: true });

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const reports = {
  shortcodes: new Map(),
  embeds: new Map(),
  skipped: [],
  duplicates: [],
  unsupported: [],
  missingAssets: [],
  externalImages: new Map(),
};

function note(map, key, sample) {
  const entry = map.get(key) ?? { key, count: 0, samples: [] };
  entry.count += 1;
  if (entry.samples.length < 5 && sample) entry.samples.push(sample);
  map.set(key, entry);
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(outDir, file), `${JSON.stringify(data, null, 2)}\n`);
}

function writeNdjson(file, rows) {
  const stream = fs.createWriteStream(path.join(outDir, file));
  for (const row of rows) stream.write(`${JSON.stringify(row)}\n`);
  stream.end();
  return new Promise((resolve) => stream.on('finish', resolve));
}

/**
 * Minimal PHP serialize() reader. WordPress stores option and meta values this
 * way. Only the subset WordPress actually emits is supported: string, int,
 * float, bool, null, array.
 */
function phpUnserialize(input) {
  if (typeof input !== 'string') return null;
  let offset = 0;

  function fail(message) {
    throw new Error(`${message} at offset ${offset}`);
  }

  function readUntil(char) {
    const index = input.indexOf(char, offset);
    if (index === -1) fail(`expected ${char}`);
    const value = input.slice(offset, index);
    offset = index + 1;
    return value;
  }

  function readValue() {
    const type = input[offset];
    switch (type) {
      case 'N': {
        offset += 2;
        return null;
      }
      case 'b': {
        offset += 2;
        const value = readUntil(';');
        return value === '1';
      }
      case 'i': {
        offset += 2;
        return Number.parseInt(readUntil(';'), 10);
      }
      case 'd': {
        offset += 2;
        return Number.parseFloat(readUntil(';'));
      }
      case 's': {
        offset += 2;
        const length = Number.parseInt(readUntil(':'), 10);
        offset += 1; // opening quote
        // Length is in bytes, not UTF-16 code units.
        const buffer = Buffer.from(input.slice(offset), 'binary');
        const raw = Buffer.from(input, 'binary').slice(
          Buffer.byteLength(input.slice(0, offset), 'binary'),
        );
        void buffer;
        const value = raw.slice(0, length).toString('binary');
        offset += value.length;
        offset += 2; // closing quote and semicolon
        return Buffer.from(value, 'binary').toString('utf8');
      }
      case 'a': {
        offset += 2;
        const count = Number.parseInt(readUntil(':'), 10);
        offset += 1; // opening brace
        const out = {};
        let isList = true;
        for (let i = 0; i < count; i += 1) {
          const key = readValue();
          const value = readValue();
          if (key !== i) isList = false;
          out[key] = value;
        }
        offset += 1; // closing brace
        return isList ? Object.values(out) : out;
      }
      case 'O': {
        // Serialized objects are a migration smell. Record and skip.
        return { __unsupported: 'php-object' };
      }
      default:
        return null;
    }
  }

  try {
    return readValue();
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Content normalization                                                      */
/* -------------------------------------------------------------------------- */

const SHORTCODE_RE = /\[(\/?)([a-zA-Z0-9_-]+)([^\]]*)\]/g;

/**
 * Records every shortcode found so the migration has a complete inventory of
 * source-platform behaviour that will not exist in the target.
 */
function inventoryShortcodes(html, context) {
  let match;
  SHORTCODE_RE.lastIndex = 0;
  while ((match = SHORTCODE_RE.exec(html)) !== null) {
    if (match[1] === '/') continue;
    note(reports.shortcodes, match[2], context);
  }
}

function inventoryEmbeds(html, context) {
  const iframes = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi) ?? [];
  for (const tag of iframes) {
    const src = /src=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src) continue;
    try {
      note(reports.embeds, new URL(src, 'https://placeholder.invalid').hostname, context);
    } catch {
      note(reports.embeds, 'unparseable', context);
    }
  }
  // Bare-URL oEmbed lines, the WordPress auto-embed convention.
  for (const line of html.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^https?:\/\/\S+$/.test(trimmed)) {
      try {
        note(reports.embeds, `oembed:${new URL(trimmed).hostname}`, context);
      } catch {
        /* ignore */
      }
    }
  }
}

/* ------------------------------ shortcodes -------------------------------- */

function parseShortcodeAttrs(raw) {
  const attrs = {};
  const re = /(\w[\w-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s\]]+))/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attrs;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function youtubeId(url) {
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/watch\?[^#]*v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/v\/([\w-]{6,})/,
  ];
  for (const pattern of patterns) {
    const found = pattern.exec(url);
    if (found) return found[1];
  }
  return null;
}

function renderVideoEmbed(url) {
  const id = youtubeId(url);
  if (id) {
    return (
      `<figure class="wp-embed wp-embed-youtube">` +
      `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video player" ` +
      `width="560" height="315" loading="lazy" frameborder="0" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
      `allowfullscreen></iframe></figure>`
    );
  }
  return null;
}

function renderOembedUrl(url) {
  const video = renderVideoEmbed(url);
  if (video) return video;
  if (/instagram\.com/.test(url)) {
    return (
      `<figure class="wp-embed wp-embed-instagram">` +
      `<blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(url)}">` +
      `<a href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank">View this post on Instagram</a>` +
      `</blockquote></figure>`
    );
  }
  if (/(twitter\.com|x\.com)\//.test(url)) {
    return (
      `<figure class="wp-embed wp-embed-twitter">` +
      `<blockquote class="twitter-tweet"><a href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(url)}</a></blockquote>` +
      `</figure>`
    );
  }
  return null;
}

/**
 * Renders the shortcodes this corpus actually uses into static HTML. Anything
 * not handled here is stripped and recorded in the unsupported report rather
 * than silently leaking bracket syntax into the rebuilt pages.
 */
function renderShortcodes(html, { context, mediaById, cdnBase }) {
  let out = html;

  // [caption ...]<img>Caption text[/caption]
  out = out.replace(
    /\[caption([^\]]*)\]([\s\S]*?)\[\/caption\]/gi,
    (_match, rawAttrs, inner) => {
      const attrs = parseShortcodeAttrs(rawAttrs);
      const lastTagEnd = inner.lastIndexOf('>');
      const media = lastTagEnd === -1 ? inner : inner.slice(0, lastTagEnd + 1);
      const caption = (lastTagEnd === -1 ? '' : inner.slice(lastTagEnd + 1)).trim();
      const align = (attrs.align || 'alignnone').replace(/[^a-z]/gi, '');
      const width = attrs.width ? ` style="max-width:${Number.parseInt(attrs.width, 10)}px"` : '';
      const id = attrs.id ? ` id="${escapeHtml(attrs.id)}"` : '';
      return (
        `<figure${id} class="wp-caption ${align}"${width}>${media.trim()}` +
        (caption ? `<figcaption class="wp-caption-text">${caption}</figcaption>` : '') +
        `</figure>`
      );
    },
  );

  // [gallery ids="1,2,3"]
  out = out.replace(/\[gallery([^\]]*)\]/gi, (_match, rawAttrs) => {
    const attrs = parseShortcodeAttrs(rawAttrs);
    const ids = (attrs.ids || '')
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter(Boolean);
    if (!ids.length) {
      reports.unsupported.push({ kind: 'gallery-without-ids', context });
      return '';
    }
    const figures = ids
      .map((id) => {
        const item = mediaById.get(id);
        if (!item) {
          reports.missingAssets.push({ context, reason: 'gallery item missing', id });
          return '';
        }
        const dims =
          item.width && item.height ? ` width="${item.width}" height="${item.height}"` : '';
        return (
          `<figure class="wp-gallery-item">` +
          `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || '')}"${dims} loading="lazy" decoding="async" />` +
          (item.caption ? `<figcaption>${item.caption}</figcaption>` : '') +
          `</figure>`
        );
      })
      .join('');
    const columns = Number.parseInt(attrs.columns || '3', 10) || 3;
    return `<div class="wp-gallery" data-columns="${columns}">${figures}</div>`;
  });

  // [youtube ...] and [embed]url[/embed]
  out = out.replace(/\[embed[^\]]*\]([\s\S]*?)\[\/embed\]/gi, (_match, url) => {
    const rendered = renderOembedUrl(url.trim());
    if (rendered) return rendered;
    reports.unsupported.push({ kind: 'embed-unhandled', context, url: url.trim() });
    return `<p><a href="${escapeHtml(url.trim())}" rel="noopener noreferrer">${escapeHtml(url.trim())}</a></p>`;
  });

  out = out.replace(/\[youtube([^\]]*)\]/gi, (_match, rawAttrs) => {
    const attrs = parseShortcodeAttrs(rawAttrs);
    const url = attrs.url || attrs.id || rawAttrs.trim();
    const rendered = renderVideoEmbed(url) ?? renderVideoEmbed(`https://youtu.be/${url}`);
    if (rendered) return rendered;
    reports.unsupported.push({ kind: 'youtube-unhandled', context, raw: rawAttrs });
    return '';
  });

  // Jetpack contact forms have no static equivalent. Record and replace with a
  // marker the target platform can bind its own form component to.
  out = out.replace(
    /\[contact-form([^\]]*)\]([\s\S]*?)\[\/contact-form\]/gi,
    (_match, rawAttrs, inner) => {
      const fields = [...inner.matchAll(/\[contact-field([^\]]*)\]/gi)].map((m) =>
        parseShortcodeAttrs(m[1]),
      );
      reports.unsupported.push({ kind: 'contact-form', context, fieldCount: fields.length });
      return `<div data-migrated-form="contact" data-fields='${escapeHtml(JSON.stringify(fields))}'></div>`;
    },
  );

  // Bare-URL oEmbed lines.
  out = out
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!/^https?:\/\/\S+$/.test(trimmed)) return line;
      return renderOembedUrl(trimmed) ?? line;
    })
    .join('\n');

  return out;
}

/**
 * Shortcode names that are safe to strip because they are plugin or core syntax
 * with no meaning outside WordPress. Anything not on this list is left in place
 * as literal text, because square brackets in prose are usually an editorial
 * insertion inside a quotation and deleting them silently corrupts the article.
 */
const KNOWN_SHORTCODES = new Set([
  'caption',
  'gallery',
  'embed',
  'youtube',
  'vimeo',
  'audio',
  'video',
  'playlist',
  'contact-form',
  'contact-field',
  'wufoo',
  'ninja_form',
  'ninja_forms',
  'vc_row',
  'vc_column',
  'vc_column_text',
  'vc_single_image',
  'vc_video',
  'et_pb_section',
  'et_pb_row',
  'et_pb_column',
  'td_block_trending_now',
  'td_block_text_with_title',
  'pl_section',
  'insert',
  'sharedaddy',
  'jetpack_subscription_form',
  'wpseo_breadcrumb',
  'gravityform',
  'su_button',
  'su_box',
]);

/**
 * Removes shortcode syntax that survived rendering so no bracket markup reaches
 * a reader, without touching bracketed prose.
 */
function stripResidualShortcodes(html, context) {
  return html.replace(
    /\[(\/?)([a-zA-Z][a-zA-Z0-9_-]*)((?:[^\]]*))\]/g,
    (match, _close, name, rest) => {
      const lower = name.toLowerCase();
      if (KNOWN_SHORTCODES.has(lower)) return '';
      // An unknown name carrying key="value" attributes is a shortcode from a
      // plugin that is no longer installed, not prose.
      if (/\w+\s*=\s*["']/.test(rest)) {
        reports.unsupported.push({ kind: 'residual-shortcode', name: lower, context });
        return '';
      }
      reports.unsupported.push({ kind: 'bracket-text-preserved', name: lower, context });
      return match;
    },
  );
}

/**
 * WordPress stores paragraph breaks as blank lines and applies wpautop() at
 * render time. Reproducing that here keeps the rebuilt markup faithful to what
 * a reader actually saw.
 */
function wpautop(html) {
  if (!html.trim()) return '';
  const blockTags =
    'table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary|iframe|script|noscript';

  let text = html.replace(/\r\n|\r/g, '\n');
  text = text.replace(new RegExp(`\\s*<(${blockTags})([\\s>])`, 'gi'), '\n\n<$1$2');
  text = text.replace(new RegExp(`</(${blockTags})>\\s*`, 'gi'), '</$1>\n\n');
  text = text.replace(/\n\s*\n+/g, '\n\n');

  const paragraphs = text.split('\n\n').filter((chunk) => chunk.trim().length > 0);
  const out = paragraphs.map((chunk) => {
    const trimmed = chunk.trim();
    if (new RegExp(`^</?(?:${blockTags})[\\s>/]`, 'i').test(trimmed)) return trimmed;
    if (/^<!--/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br />\n')}</p>`;
  });

  return out.join('\n\n');
}

/**
 * Rewrites every reference to a local uploads path so it points at the object
 * storage origin the media already lives on. Returns the rewritten HTML plus
 * the set of asset paths the document depends on.
 */
function rewriteAssetUrls(html, { siteHosts, uploadsBase, cdnBase, objectDirBySourceDir }) {
  const referenced = new Set();
  let out = html;

  /**
   * Media offload plugins do not store the object under the same key as the
   * local upload path. WP Offload Media prefixes each object with a version
   * segment, so `2021/05/photo.jpg` is stored as
   * `wp-content/uploads/2021/05/19222335/photo.jpg`. The database keeps the
   * pre-offload path and the plugin swaps it at render time.
   *
   * Every reference therefore has to be resolved through the offload table.
   * Concatenating a CDN hostname onto the stored path produces a URL that
   * looks correct and 404s for every image on the site.
   */
  const resolve = (rawPath) => {
    const relative = rawPath.replace(/^\//, '');
    const withinUploads = relative.replace(
      new RegExp(`^${uploadsBase.replace(/^\//, '')}/`),
      '',
    );
    const dir = path.posix.dirname(withinUploads);
    const file = path.posix.basename(withinUploads);
    // Size variants live beside the original, so the original's directory
    // resolves the whole family: photo.jpg, photo-300x200.jpg, photo-scaled.jpg.
    const stem = file.replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/-scaled(?=\.\w+$)/, '');
    const objectDir =
      objectDirBySourceDir.get(`${dir}/${stem}`) ?? objectDirBySourceDir.get(`${dir}/${file}`);

    if (!objectDir) {
      reports.missingAssets.push({ reason: 'no offload record for referenced path', path: relative });
      note(reports.externalImages, dir, relative);
      return `${cdnBase}/${relative}`;
    }
    referenced.add(`${objectDir}/${file}`);
    return `${cdnBase}/${objectDir}/${file}`;
  };

  const hostPattern = siteHosts.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const absolute = new RegExp(`https?://(?:${hostPattern})(${uploadsBase}/[^"'\\s)>]+)`, 'gi');
  out = out.replace(absolute, (_match, filePath) => resolve(filePath));

  const rootRelative = new RegExp(`(["'(\\s])(${uploadsBase}/[^"'\\s)>]+)`, 'gi');
  out = out.replace(rootRelative, (_match, lead, filePath) => `${lead}${resolve(filePath)}`);

  return { html: out, referenced: [...referenced] };
}

/**
 * Rewrites internal links so they stay relative to the new site root. Legacy
 * absolute links to the old host would otherwise leave the new site on click.
 */
function rewriteInternalLinks(html, siteHosts) {
  const hostPattern = siteHosts.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(href=["'])https?://(?:${hostPattern})(/[^"']*)?(["'])`, 'gi');
  return html.replace(re, (_m, lead, tail, close) => `${lead}${tail || '/'}${close}`);
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerptFrom(html, words = 55) {
  const text = stripHtml(html);
  const parts = text.split(' ');
  if (parts.length <= words) return text;
  return `${parts.slice(0, words).join(' ')}…`;
}

function readingTimeMinutes(html) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Builds the permalink WordPress would have produced, so the rebuilt routes and
 * the redirect map agree with what search engines already have indexed.
 */
function permalinkFor(post, structure) {
  const date = new Date(post.post_date_gmt ?? post.post_date);
  const pad = (n) => String(n).padStart(2, '0');
  const replacements = {
    '%year%': String(date.getUTCFullYear()),
    '%monthnum%': pad(date.getUTCMonth() + 1),
    '%day%': pad(date.getUTCDate()),
    '%hour%': pad(date.getUTCHours()),
    '%minute%': pad(date.getUTCMinutes()),
    '%second%': pad(date.getUTCSeconds()),
    '%postname%': post.post_name,
    '%post_id%': String(post.ID),
  };
  let route = structure;
  for (const [token, value] of Object.entries(replacements)) {
    route = route.split(token).join(value);
  }
  if (!route.startsWith('/')) route = `/${route}`;
  if (!route.endsWith('/')) route = `${route}/`;
  return route;
}

/* -------------------------------------------------------------------------- */
/* Extraction                                                                 */
/* -------------------------------------------------------------------------- */

const connection = await mysql.createConnection({
  socketPath: config.database.socketPath,
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  dateStrings: true,
});

async function query(sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

console.log('Reading site settings');

const optionRows = await query(
  `SELECT option_name, option_value FROM ${T('options')} WHERE option_name IN (
     'siteurl','home','blogname','blogdescription','permalink_structure','posts_per_page',
     'show_on_front','page_on_front','page_for_posts','category_base','tag_base',
     'timezone_string','date_format','time_format','start_of_week','blog_charset'
   )`,
);
const options = Object.fromEntries(optionRows.map((r) => [r.option_name, r.option_value]));

const homeUrl = config.site?.homeUrl ?? options.home;
const siteHosts = config.site?.hosts ?? [new URL(homeUrl).host, new URL(homeUrl).host.replace(/^www\./, '')];
const permalinkStructure = options.permalink_structure || '/%year%/%monthnum%/%day%/%postname%/';
const uploadsBase = config.media?.uploadsBase ?? '/wp-content/uploads';
const cdnBase = (config.media?.cdnBase ?? '').replace(/\/$/, '');
const postsPerPage = Number.parseInt(options.posts_per_page || '10', 10);

console.log('Reading users');

const users = await query(
  `SELECT u.ID, u.user_login, u.user_nicename, u.display_name, u.user_url, u.user_registered
     FROM ${T('users')} u`,
);
const userMetaRows = await query(
  `SELECT user_id, meta_key, meta_value FROM ${T('usermeta')}
    WHERE meta_key IN ('description','first_name','last_name','wp_capabilities','twitter','facebook')`,
);
const userMeta = new Map();
for (const row of userMetaRows) {
  if (!userMeta.has(row.user_id)) userMeta.set(row.user_id, {});
  userMeta.get(row.user_id)[row.meta_key] = row.meta_value;
}

console.log('Reading taxonomies');

const terms = await query(
  `SELECT t.term_id, t.name, t.slug, tt.taxonomy, tt.description, tt.parent, tt.count
     FROM ${T('terms')} t
     JOIN ${T('term_taxonomy')} tt ON tt.term_id = t.term_id`,
);
const termById = new Map(terms.map((t) => [Number(t.term_id), t]));

const relationships = await query(
  `SELECT tr.object_id, tt.term_id, tt.taxonomy
     FROM ${T('term_relationships')} tr
     JOIN ${T('term_taxonomy')} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id`,
);
const termsByObject = new Map();
for (const row of relationships) {
  const id = Number(row.object_id);
  if (!termsByObject.has(id)) termsByObject.set(id, []);
  termsByObject.get(id).push({ termId: Number(row.term_id), taxonomy: row.taxonomy });
}

console.log('Reading media library');

const offloadRows = config.media?.offloadTable
  ? await query(
      `SELECT source_id, provider, region, bucket, path, original_path,
              source_path, original_source_path, is_private
         FROM \`${config.media.offloadTable}\` WHERE source_type = 'media-library'`,
    ).catch(() => [])
  : [];
const offloadBySource = new Map(offloadRows.map((r) => [Number(r.source_id), r]));

/**
 * Maps the pre-offload upload path of each original file to the directory its
 * object actually lives in, so references written into post content can be
 * resolved to real object keys.
 */
const objectDirBySourceDir = new Map();
for (const row of offloadRows) {
  if (!row.source_path || !row.path) continue;
  objectDirBySourceDir.set(row.source_path, path.posix.dirname(row.path));
}

const attachments = await query(
  `SELECT ID, post_parent, post_title, post_excerpt, post_content, post_date_gmt,
          post_mime_type, guid, post_name
     FROM ${T('posts')} WHERE post_type = 'attachment'`,
);
const attachmentMetaRows = await query(
  `SELECT post_id, meta_key, meta_value FROM ${T('postmeta')}
    WHERE meta_key IN ('_wp_attached_file','_wp_attachment_metadata','_wp_attachment_image_alt')`,
);
const attachmentMeta = new Map();
for (const row of attachmentMetaRows) {
  const id = Number(row.post_id);
  if (!attachmentMeta.has(id)) attachmentMeta.set(id, {});
  attachmentMeta.get(id)[row.meta_key] = row.meta_value;
}

const media = [];
for (const row of attachments) {
  const id = Number(row.ID);
  const meta = attachmentMeta.get(id) ?? {};
  const attachedFile = meta._wp_attached_file;
  const metadata = phpUnserialize(meta._wp_attachment_metadata ?? '') ?? {};
  const offload = offloadBySource.get(id);

  const relativePath = attachedFile ? `${uploadsBase.replace(/^\//, '')}/${attachedFile}` : null;
  const offloadPath = offload?.path ?? null;
  const publicPath = offloadPath ?? relativePath;

  if (!publicPath) {
    reports.missingAssets.push({ id, title: row.post_title, reason: 'no attached file' });
    continue;
  }

  const sizes = {};
  if (metadata && typeof metadata === 'object' && metadata.sizes) {
    const dir = path.posix.dirname(publicPath);
    for (const [name, size] of Object.entries(metadata.sizes)) {
      if (!size || typeof size !== 'object') continue;
      sizes[name] = {
        file: `${cdnBase}/${dir}/${size.file}`,
        width: Number(size.width) || null,
        height: Number(size.height) || null,
        mimeType: size['mime-type'] ?? null,
      };
    }
  }

  media.push({
    id,
    slug: row.post_name,
    title: row.post_title,
    alt: meta._wp_attachment_image_alt ?? '',
    caption: row.post_excerpt ?? '',
    description: row.post_content ?? '',
    mimeType: row.post_mime_type,
    uploadedAt: row.post_date_gmt,
    parentId: Number(row.post_parent) || null,
    sourcePath: publicPath,
    url: `${cdnBase}/${publicPath}`,
    width: Number(metadata?.width) || null,
    height: Number(metadata?.height) || null,
    sizes,
    storage: offload
      ? {
          provider: offload.provider,
          region: offload.region,
          bucket: offload.bucket,
          private: Boolean(offload.is_private),
        }
      : { provider: 'local' },
    offloaded: Boolean(offload),
  });
}

const mediaById = new Map(media.map((m) => [m.id, m]));
const notOffloaded = media.filter((m) => !m.offloaded);
if (notOffloaded.length) {
  reports.unsupported.push({
    kind: 'media-not-offloaded',
    count: notOffloaded.length,
    detail:
      'These attachments have no object-storage record. They must be uploaded before the CDN base URL will resolve.',
    samples: notOffloaded.slice(0, 20).map((m) => m.sourcePath),
  });
}

console.log('Reading SEO metadata');

let seoByObject = new Map();
if (config.seo?.yoastIndexableTable) {
  const seoRows = await query(
    `SELECT object_id, object_type, object_sub_type, title, description, canonical,
            is_robots_noindex, is_robots_nofollow, open_graph_title, open_graph_description,
            open_graph_image, twitter_title, twitter_description, twitter_image,
            primary_focus_keyword, estimated_reading_time_minutes, schema_article_type,
            schema_page_type, breadcrumb_title
       FROM \`${config.seo.yoastIndexableTable}\``,
  ).catch(() => []);
  for (const row of seoRows) {
    seoByObject.set(`${row.object_type}:${row.object_id}`, row);
  }
}

console.log('Reading posts and pages');

const contentTypes = config.contentTypes ?? ['post', 'page'];
const statuses = config.statuses ?? ['publish'];

const placeholders = contentTypes.map(() => '?').join(',');
const statusPlaceholders = statuses.map(() => '?').join(',');

const postRows = await query(
  `SELECT ID, post_author, post_date, post_date_gmt, post_modified_gmt, post_content,
          post_title, post_excerpt, post_status, post_name, post_type, post_parent,
          menu_order, comment_count, post_mime_type
     FROM ${T('posts')}
    WHERE post_type IN (${placeholders}) AND post_status IN (${statusPlaceholders})
    ORDER BY post_date DESC`,
  [...contentTypes, ...statuses],
);

const postIds = postRows.map((r) => Number(r.ID));
const postMeta = new Map();
if (postIds.length) {
  const chunkSize = 5000;
  for (let i = 0; i < postIds.length; i += chunkSize) {
    const chunk = postIds.slice(i, i + chunkSize);
    const rows = await query(
      `SELECT post_id, meta_key, meta_value FROM ${T('postmeta')}
        WHERE post_id IN (${chunk.map(() => '?').join(',')})
          AND meta_key NOT LIKE '\\_edit%'`,
      chunk,
    );
    for (const row of rows) {
      const id = Number(row.post_id);
      if (!postMeta.has(id)) postMeta.set(id, {});
      postMeta.get(id)[row.meta_key] = row.meta_value;
    }
  }
}

const seenRoutes = new Map();
const documents = [];

for (const row of postRows) {
  const id = Number(row.ID);
  const meta = postMeta.get(id) ?? {};
  const context = `${row.post_type}#${id}`;

  if (!row.post_name) {
    reports.skipped.push({ id, type: row.post_type, title: row.post_title, reason: 'empty slug' });
    continue;
  }

  const rawContent = row.post_content ?? '';
  inventoryShortcodes(rawContent, context);
  inventoryEmbeds(rawContent, context);

  const shortcoded = renderShortcodes(rawContent, { context, mediaById, cdnBase });
  const cleaned = stripResidualShortcodes(shortcoded, context);
  const autop = wpautop(cleaned);
  const linked = rewriteInternalLinks(autop, siteHosts);
  const { html, referenced } = rewriteAssetUrls(linked, {
    siteHosts,
    uploadsBase,
    cdnBase,
    objectDirBySourceDir,
  });

  const objectTerms = termsByObject.get(id) ?? [];
  const categories = objectTerms
    .filter((t) => t.taxonomy === 'category')
    .map((t) => termById.get(t.termId))
    .filter(Boolean)
    .map((t) => ({ id: Number(t.term_id), name: t.name, slug: t.slug }));
  const tags = objectTerms
    .filter((t) => t.taxonomy === 'post_tag')
    .map((t) => termById.get(t.termId))
    .filter(Boolean)
    .map((t) => ({ id: Number(t.term_id), name: t.name, slug: t.slug }));

  const thumbnailId = meta._thumbnail_id ? Number(meta._thumbnail_id) : null;
  const featured = thumbnailId ? mediaById.get(thumbnailId) ?? null : null;
  if (thumbnailId && !featured) {
    reports.missingAssets.push({ id, reason: 'featured image not in media library', thumbnailId });
  }

  const route =
    row.post_type === 'page'
      ? `/${row.post_name}/`
      : permalinkFor(row, permalinkStructure);

  if (seenRoutes.has(route)) {
    reports.duplicates.push({ route, ids: [seenRoutes.get(route), id] });
  } else {
    seenRoutes.set(route, id);
  }

  const seo = seoByObject.get(`post:${id}`) ?? null;
  const author = users.find((u) => Number(u.ID) === Number(row.post_author));

  documents.push({
    id,
    kind: row.post_type,
    route,
    legacyUrls: [
      route,
      route.replace(/\/$/, ''),
      `/?p=${id}`,
    ],
    slug: row.post_name,
    title: row.post_title,
    status: row.post_status,
    publishedAt: row.post_date_gmt,
    publishedAtLocal: row.post_date,
    updatedAt: row.post_modified_gmt,
    menuOrder: Number(row.menu_order) || 0,
    parentId: Number(row.post_parent) || null,
    commentCount: Number(row.comment_count) || 0,
    author: author
      ? {
          id: Number(author.ID),
          slug: author.user_nicename,
          name: author.display_name,
          url: author.user_url || null,
          bio: userMeta.get(Number(author.ID))?.description ?? '',
        }
      : null,
    categories,
    tags,
    featuredImage: featured
      ? { id: featured.id, url: featured.url, alt: featured.alt, width: featured.width, height: featured.height, caption: featured.caption }
      : null,
    excerpt: row.post_excerpt?.trim() ? stripHtml(row.post_excerpt) : excerptFrom(rawContent),
    readingTimeMinutes: readingTimeMinutes(rawContent),
    contentHtml: html,
    contentRaw: rawContent,
    assets: referenced,
    seo: seo
      ? {
          title: seo.title || null,
          description: seo.description || null,
          canonical: seo.canonical || null,
          noindex: seo.is_robots_noindex === 1,
          nofollow: seo.is_robots_nofollow === 1,
          openGraph: {
            title: seo.open_graph_title || null,
            description: seo.open_graph_description || null,
            image: seo.open_graph_image || null,
          },
          twitter: {
            title: seo.twitter_title || null,
            description: seo.twitter_description || null,
            image: seo.twitter_image || null,
          },
          focusKeyword: seo.primary_focus_keyword || null,
          schemaArticleType: seo.schema_article_type || null,
        }
      : null,
    source: {
      platform: 'wordpress',
      table: `${prefix}posts`,
      id,
      permalinkStructure,
    },
  });
}

console.log('Reading navigation menus');

const menuTerms = terms.filter((t) => t.taxonomy === 'nav_menu');
const menuItemRows = await query(
  `SELECT ID, post_title, menu_order, post_parent, post_name
     FROM ${T('posts')} WHERE post_type = 'nav_menu_item' AND post_status = 'publish'`,
);
const menuItemIds = menuItemRows.map((r) => Number(r.ID));
const menuItemMeta = new Map();
if (menuItemIds.length) {
  const rows = await query(
    `SELECT post_id, meta_key, meta_value FROM ${T('postmeta')}
      WHERE post_id IN (${menuItemIds.map(() => '?').join(',')})`,
    menuItemIds,
  );
  for (const row of rows) {
    const id = Number(row.post_id);
    if (!menuItemMeta.has(id)) menuItemMeta.set(id, {});
    menuItemMeta.get(id)[row.meta_key] = row.meta_value;
  }
}

const menus = menuTerms.map((menu) => {
  const memberIds = relationships
    .filter((r) => Number(r.term_id) === Number(menu.term_id))
    .map((r) => Number(r.object_id));
  const items = menuItemRows
    .filter((item) => memberIds.includes(Number(item.ID)))
    .map((item) => {
      const meta = menuItemMeta.get(Number(item.ID)) ?? {};
      const objectId = meta._menu_item_object_id ? Number(meta._menu_item_object_id) : null;
      const type = meta._menu_item_type ?? 'custom';
      const object = meta._menu_item_object ?? null;
      let url = meta._menu_item_url ?? null;
      if (type === 'taxonomy' && objectId) {
        const term = termById.get(objectId);
        if (term) url = `/${term.taxonomy === 'category' ? 'category' : 'tag'}/${term.slug}/`;
      }
      if (type === 'post_type' && objectId) {
        const doc = documents.find((d) => d.id === objectId);
        if (doc) url = doc.route;
      }
      return {
        id: Number(item.ID),
        parentId: Number(meta._menu_item_menu_item_parent) || null,
        order: Number(item.menu_order) || 0,
        label: item.post_title || termById.get(objectId)?.name || '',
        url,
        type,
        object,
        objectId,
        target: meta._menu_item_target || null,
      };
    })
    .sort((a, b) => a.order - b.order);
  return { id: Number(menu.term_id), name: menu.name, slug: menu.slug, items };
});

console.log('Reading redirects');

let legacyRedirects = [];
if (config.redirects?.table) {
  const rows = await query(
    `SELECT url, final_dest, code, disabled, type FROM \`${config.redirects.table}\` WHERE disabled = 0`,
  ).catch(() => []);
  legacyRedirects = rows
    .map((row) => {
      let destination = row.final_dest;
      if (/^\d+$/.test(String(destination))) {
        const doc = documents.find((d) => d.id === Number(destination));
        destination = doc?.route ?? null;
      }
      if (!destination) return null;
      return {
        from: row.url,
        to: destination,
        status: Number(row.code) || 301,
        source: config.redirects.table,
      };
    })
    .filter(Boolean);
}

/* Structural redirects every WordPress migration needs. */
const structuralRedirects = [
  { from: '/feed/', to: '/rss.xml', status: 301, source: 'structural' },
  { from: '/comments/feed/', to: '/rss.xml', status: 301, source: 'structural' },
  { from: '/wp-json/*', to: '/404', status: 410, source: 'structural' },
  { from: '/xmlrpc.php', to: '/404', status: 410, source: 'structural' },
  { from: '/wp-login.php', to: '/404', status: 410, source: 'structural' },
  { from: '/wp-admin/*', to: '/404', status: 410, source: 'structural' },
];

for (const doc of documents) {
  structuralRedirects.push({
    from: `/?p=${doc.id}`,
    to: doc.route,
    status: 301,
    source: 'shortlink',
  });
}

/* -------------------------------------------------------------------------- */
/* Emit                                                                       */
/* -------------------------------------------------------------------------- */

console.log('Writing dataset');

const posts = documents.filter((d) => d.kind === 'post');
const pages = documents.filter((d) => d.kind === 'page');

await writeNdjson('posts.ndjson', posts);
await writeNdjson('pages.ndjson', pages);
await writeNdjson('media.ndjson', media);

writeJson(
  'categories.json',
  terms
    .filter((t) => t.taxonomy === 'category')
    .map((t) => ({
      id: Number(t.term_id),
      name: t.name,
      slug: t.slug,
      description: t.description ?? '',
      parentId: Number(t.parent) || null,
      count: Number(t.count),
      route: `/category/${t.slug}/`,
    })),
);

writeJson(
  'tags.json',
  terms
    .filter((t) => t.taxonomy === 'post_tag')
    .map((t) => ({
      id: Number(t.term_id),
      name: t.name,
      slug: t.slug,
      description: t.description ?? '',
      count: Number(t.count),
      route: `/tag/${t.slug}/`,
    })),
);

const authorsWithPosts = new Map();
for (const doc of posts) {
  if (!doc.author) continue;
  const entry = authorsWithPosts.get(doc.author.id) ?? { ...doc.author, postCount: 0 };
  entry.postCount += 1;
  authorsWithPosts.set(doc.author.id, entry);
}
writeJson(
  'authors.json',
  [...authorsWithPosts.values()]
    .sort((a, b) => b.postCount - a.postCount)
    .map((a) => ({ ...a, route: `/author/${a.slug}/` })),
);

writeJson('menus.json', menus);

writeJson('site.json', {
  name: options.blogname,
  description: options.blogdescription,
  homeUrl,
  hosts: siteHosts,
  permalinkStructure,
  postsPerPage,
  timezone: options.timezone_string,
  dateFormat: options.date_format,
  timeFormat: options.time_format,
  showOnFront: options.show_on_front,
  categoryBase: options.category_base || 'category',
  tagBase: options.tag_base || 'tag',
  media: { cdnBase, uploadsBase },
  counts: {
    posts: posts.length,
    pages: pages.length,
    media: media.length,
    categories: terms.filter((t) => t.taxonomy === 'category').length,
    tags: terms.filter((t) => t.taxonomy === 'post_tag').length,
    authors: authorsWithPosts.size,
  },
});

writeJson('redirects.json', [...legacyRedirects, ...structuralRedirects]);

writeJson('reports/shortcodes.json', [...reports.shortcodes.values()].sort((a, b) => b.count - a.count));
writeJson('reports/embeds.json', [...reports.embeds.values()].sort((a, b) => b.count - a.count));
writeJson('reports/skipped.json', reports.skipped);
writeJson('reports/duplicates.json', reports.duplicates);
writeJson('reports/unsupported.json', reports.unsupported);
writeJson('reports/missing-assets.json', reports.missingAssets);

console.log(
  `Done. ${posts.length} posts, ${pages.length} pages, ${media.length} media, ` +
    `${legacyRedirects.length + structuralRedirects.length} redirects.`,
);

await connection.end();
