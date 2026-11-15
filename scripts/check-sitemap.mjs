#!/usr/bin/env node
/**
 * Deploy gate on the sitemap. Two checks:
 *
 *   1. Every path in the LIVE sitemap is present in the sitemap about to be
 *      deployed.        liveSitemap  subset of  builtSitemap
 *   2. Every path in the sitemap about to be deployed is present in _site.
 *                      builtSitemap subset of  builtPages
 *
 * Together these guarantee liveSitemap is a subset of builtPages, so no live
 * page can be dropped, and the deployed sitemap never lists a page that is not
 * actually built.
 *
 * Comparison is exact and case-sensitive: paths are compared as strings taken
 * from directory entry names, never lowercased and never resolved through the
 * filesystem. Run on Linux CI so the build itself matches production.
 *
 * Exit 0 = both checks pass. Exit 1 = a path is missing. Exit 2 = live sitemap
 * unreadable/empty, or the built sitemap is missing.
 *
 * Env:
 *   SITE_URL       origin to read the live sitemap from (default https://okmanideep.me)
 *   LIVE_SITEMAP   read the live sitemap from this local file instead of the network
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const SITE_URL = process.env.SITE_URL ?? "https://okmanideep.me";
const SITE_DIR = "_site";
const BUILT_SITEMAP = join(SITE_DIR, "sitemap.xml");

const LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/g;

function locs(xml) {
	return [...xml.matchAll(LOC_RE)].map((m) => m[1]);
}

/** Absolute URL -> canonical site path, e.g. https://x/foo/ -> /foo/ */
function toPath(loc) {
	const { pathname } = new URL(loc);
	let p = decodeURIComponent(pathname);
	// Pages are served with a trailing slash; files keep their extension.
	if (!p.endsWith("/") && !/\.[a-z0-9]+$/i.test(p)) p += "/";
	return p;
}

/** Walk _site and map generated HTML files to the paths they are served at. */
async function builtPaths(dir = SITE_DIR, prefix = "/") {
	const paths = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return paths;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			paths.push(...(await builtPaths(full, `${prefix}${entry.name}/`)));
		} else if (entry.name === "index.html") {
			paths.push(prefix);
		} else if (entry.name.endsWith(".html")) {
			paths.push(`${prefix}${entry.name}`);
		}
	}
	return paths;
}

async function liveSitemap() {
	if (process.env.LIVE_SITEMAP) {
		return readFile(process.env.LIVE_SITEMAP, "utf8");
	}
	const url = `${SITE_URL}/sitemap.xml?cb=${Date.now()}`;
	let lastErr;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
			if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
			return await res.text();
		} catch (err) {
			lastErr = err;
			await new Promise((r) => setTimeout(r, 1000 * attempt));
		}
	}
	throw lastErr;
}

function check(label, missing) {
	if (missing.length === 0) {
		console.log(`  ok   ${label}`);
		return true;
	}
	console.error(`  FAIL ${label}`);
	for (const p of missing) console.error(`         - ${p}`);
	return false;
}

async function main() {
	let liveXml;
	try {
		liveXml = await liveSitemap();
	} catch (err) {
		console.error(`Cannot read live sitemap at ${SITE_URL}/sitemap.xml: ${err.message}`);
		process.exit(2);
	}

	let builtXml;
	try {
		builtXml = await readFile(BUILT_SITEMAP, "utf8");
	} catch {
		console.error(`Cannot read ${BUILT_SITEMAP}; did the build run?`);
		process.exit(2);
	}

	const live = [...new Set(locs(liveXml).map(toPath))].sort();
	if (live.length === 0) {
		console.error(`Live sitemap at ${SITE_URL}/sitemap.xml listed no URLs; refusing to pass.`);
		process.exit(2);
	}

	const builtSitemap = [...new Set(locs(builtXml).map(toPath))].sort();
	const builtPages = new Set(await builtPaths());
	const liveSet = new Set(live);

	console.log(`Live sitemap:  ${live.length} URLs from ${process.env.LIVE_SITEMAP ?? SITE_URL}`);
	console.log(`Deploying:     ${builtSitemap.length} URLs in sitemap.xml, ${builtPages.size} pages in ${SITE_DIR}`);

	const ok = [
		check(
			`every live sitemap path is in the sitemap being deployed (${live.length} checked)`,
			live.filter((p) => !builtSitemap.includes(p)),
		),
		check(
			`every deployed sitemap path exists in ${SITE_DIR} (${builtSitemap.length} checked)`,
			builtSitemap.filter((p) => !builtPages.has(p)),
		),
	].every(Boolean);

	const added = builtSitemap.filter((p) => !liveSet.has(p));
	if (added.length) {
		console.log(`  note ${added.length} new path(s) in the deployed sitemap (allowed):`);
		for (const p of added) console.log(`         + ${p}`);
	}

	// Informational only, never fails: pages built but not listed in the sitemap.
	const unlisted = [...builtPages].filter((p) => !builtSitemap.includes(p)).sort();
	if (unlisted.length) {
		console.log(`  note ${unlisted.length} built page(s) missing from the sitemap (not checked here):`);
		for (const p of unlisted) console.log(`         ? ${p}`);
	}

	if (!ok) process.exit(1);
	console.log("PASS: the deployed sitemap covers every live path and only lists built pages.");
}

main();
