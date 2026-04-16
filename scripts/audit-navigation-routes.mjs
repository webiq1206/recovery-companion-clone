/**
 * Release navigation audit: static + dynamic router targets vs app/ route manifest.
 *
 * Usage:
 *   npm run audit:nav
 *   node scripts/audit-navigation-routes.mjs --verbose   (full per-target matrix)
 *
 * Exits 1 if any router.push/replace, Redirect href, pathname, legacy map entry,
 * or configured dynamic route does not resolve to a known app route.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const VERBOSE = process.argv.includes('--verbose');

/** @param {string} relPosix path relative to app/ using / */
function hrefsFromRouteFile(relPosix) {
  if (!relPosix.endsWith('.tsx')) return [];
  const parts = relPosix.slice(0, -4).split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last === '_layout') return [];
  if (last.startsWith('+')) return [];

  let routeParts = [...parts];
  if (routeParts[routeParts.length - 1] === 'index') {
    routeParts.pop();
  }
  if (routeParts.length === 0) return ['/'];

  const groupedHref = '/' + routeParts.join('/');
  const collapsedParts = routeParts.filter((p) => !/^\([^)]+\)$/.test(p));
  /** @type {string[]} */
  const out = [groupedHref];
  if (collapsedParts.length > 0) {
    const collapsedHref = '/' + collapsedParts.join('/');
    if (collapsedHref !== groupedHref) out.push(collapsedHref);
  }
  return out;
}

/** @returns {Generator<string>} */
function* walkAppTsx(dir, baseRel = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = baseRel ? `${baseRel}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkAppTsx(full, rel);
    } else if (e.isFile() && e.name.endsWith('.tsx')) {
      yield rel.split(path.sep).join('/');
    }
  }
}

function parseLegacyRouteMap() {
  const src = fs.readFileSync(path.join(ROOT, 'utils', 'legacyRoutes.ts'), 'utf8');
  const map = {};
  const re = /'([^']+)':\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    map[m[1]] = m[2];
  }
  return map;
}

function stripQuery(href) {
  const i = href.indexOf('?');
  return i === -1 ? href : href.slice(0, i);
}

function resolveOnce(pathname, legacyMap) {
  const base = stripQuery(pathname);
  return legacyMap[base] ?? base;
}

/** Collect route: '...' and href: '...' from TS-like files */
function extractQuotedRoutes(fileRel, patterns) {
  const abs = path.join(ROOT, ...fileRel.split('/'));
  if (!fs.existsSync(abs)) return [];
  const text = fs.readFileSync(abs, 'utf8');
  /** @type {Set<string>} */
  const found = new Set();
  for (const re of patterns) {
    let m;
    const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = rx.exec(text))) {
      if (m[1] && m[1].startsWith('/')) found.add(m[1]);
    }
  }
  return [...found];
}

const SCAN_DIRS = ['app', 'components', 'hooks', 'providers', 'features', 'utils', 'core'].map((d) =>
  path.join(ROOT, d),
);

/** @param {string} dir */
function* walkSourceFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      yield* walkSourceFiles(full);
    } else if (e.isFile() && (e.name.endsWith('.tsx') || e.name.endsWith('.ts'))) {
      yield full;
    }
  }
}

function scanRepoForHrefLiterals() {
  /** @type {Map<string, Set<string>>} */
  const byPath = new Map();
  const patterns = [
    /router\.(?:push|replace)\(\s*['"]([^'"]+)['"]/g,
    /\.router\.(?:push|replace)\(\s*['"]([^'"]+)['"]/g,
    /pathname:\s*['"]([^'"]+)['"]/g,
    /Redirect\s+href=\{?['"]([^'"]+)['"]/g,
    /Redirect\s+href="([^"]+)"/g,
    /Redirect\s+href=\{\s*['"]([^'"]+)['"]/g,
    /href=\{?['"]([^'"]+)['"]\s*as\s+any/g,
  ];

  for (const base of SCAN_DIRS) {
    for (const full of walkSourceFiles(base)) {
      const text = fs.readFileSync(full, 'utf8');
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text))) {
          const href = m[1].trim();
          if (!href.startsWith('/')) continue;
          if (!byPath.has(rel)) byPath.set(rel, new Set());
          byPath.get(rel).add(href);
        }
      }
    }
  }
  return byPath;
}

function main() {
  /** @type {Set<string>} */
  const manifest = new Set();
  /** @type {Map<string, string>} */
  const hrefToFile = new Map();

  for (const rel of walkAppTsx(APP)) {
    for (const h of hrefsFromRouteFile(rel)) {
      manifest.add(h);
      if (!hrefToFile.has(h)) hrefToFile.set(h, `app/${rel}`);
    }
  }

  const legacyMap = parseLegacyRouteMap();
  for (const [k, v] of Object.entries(legacyMap)) {
    manifest.add(k);
    manifest.add(v);
  }

  function existsEffective(href) {
    const base = stripQuery(href);
    const resolved = resolveOnce(base, legacyMap);
    if (manifest.has(base) || manifest.has(resolved)) return { ok: true, resolved };
    return { ok: false, resolved };
  }

  const dynamicPatterns = [/route:\s*['"](\/[^'"]+)['"]/g, /href:\s*['"](\/[^'"]+)['"]/g];

  const dynamicFiles = [
    'utils/todayPlanGenerator.ts',
    'utils/wizardEngine.ts',
    'providers/RiskPredictionProvider.tsx',
    'features/tools/registry.ts',
  ];

  /** @type {{ raw: string, source: string, ok: boolean, resolved?: string }[]} */
  const rows = [];

  const grepMap = scanRepoForHrefLiterals();
  for (const [file, hrefs] of grepMap) {
    for (const href of hrefs) {
      const { ok, resolved } = existsEffective(href);
      rows.push({ raw: href, source: file, ok, resolved });
    }
  }

  for (const f of dynamicFiles) {
    const routes = extractQuotedRoutes(f, dynamicPatterns);
    for (const href of routes) {
      const { ok, resolved } = existsEffective(href);
      rows.push({ raw: href, source: f, ok, resolved });
    }
  }

  for (const [legacyKey, legacyVal] of Object.entries(legacyMap)) {
    for (const [href, label] of [
      [legacyKey, 'legacy key'],
      [legacyVal, 'legacy value'],
    ]) {
      const { ok, resolved } = existsEffective(href);
      rows.push({ raw: href, source: `utils/legacyRoutes.ts (${label})`, ok, resolved });
    }
  }

  const bad = rows.filter((r) => !r.ok);
  const seen = new Set();
  const uniqueBad = bad.filter((r) => {
    const k = `${r.source}|${r.raw}|${r.resolved}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (VERBOSE) {
    console.log('--- Route manifest (sample) ---');
    const sorted = [...manifest].sort();
    console.log(sorted.slice(0, 80).join('\n'), sorted.length > 80 ? `\n... +${sorted.length - 80} more` : '');
    console.log('\n--- All audit rows ---\n');
    for (const r of rows.sort((a, b) => a.raw.localeCompare(b.raw))) {
      console.log(`${r.ok ? 'OK' : 'XX'}\t${r.source}\t${r.raw}${r.resolved ? `\t=> ${r.resolved}` : ''}`);
    }
  }

  console.log(`Navigation audit: ${rows.length} checks, ${uniqueBad.length} missing route(s).`);

  if (uniqueBad.length) {
    console.error('\nMissing destinations:');
    for (const r of uniqueBad) {
      console.error(`  ${r.source}: ${r.raw}`);
    }
    process.exit(1);
  }

  console.log('All router targets resolve to known app routes or legacy map entries.');
}

main();
