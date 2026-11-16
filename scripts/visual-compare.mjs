#!/usr/bin/env node
/**
 * Visual regression check: build screenshot of every page in _site and compare
 * it pixel-for-pixel against the same page on the live site.
 *
 *   npm run visual                 # one post page + one tag page (fast default)
 *   npm run visual -- --all        # every page in the sitemap (slow, ~90s)
 *   npm run visual -- --only /,/tag/AI/
 *   npm run visual -- --out /tmp/myshots --tolerance 50 --failures-only
 *
 * Why this exists: the deploy gate (`npm run check`) guarantees the sitemap is
 * complete, but it cannot tell you that a page still *looks* right after a
 * dependency upgrade. This does.
 *
 * Screenshots are never committed: they go to a fresh directory under the OS
 * temp dir (printed at the end), so nothing lands in the repo.
 *
 * Determinism notes (learned the hard way):
 *   - Third-party resources (imgur, YouTube, asciinema, s3) are blocked on BOTH
 *     sides. They are slow, sometimes hotlink-block localhost, and their layout
 *     would make the comparison flaky for reasons unrelated to the build.
 *   - Both sides are rendered by the same local Chrome, so font rasterization
 *     and antialiasing are identical and a 0-pixel tolerance is realistic.
 *   - Requires the site to build in IST; `.eleventy.js` pins that, and this
 *     script serves the already-built `_site`, so it does not re-render.
 *
 * Requires a local Chrome/Chromium (playwright-core downloads no browsers).
 * Set CHROME_PATH to point at a specific binary.
 */

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright-core";

const SITE_DIR = "_site";
const LIVE_ORIGIN = process.env.LIVE_ORIGIN ?? "https://okmanideep.me";
const SITE_ORIGIN_FOR_URLS = LIVE_ORIGIN; // sitemap <loc> values use this origin

// Above this height, growing the viewport to the page is not worth it.
const MAX_SINGLE_PASS_HEIGHT = 12000;

const VIEWPORTS = {
	desktop: { width: 1280, height: 900 },
	mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

const MIME = {
	".html": "text/html; charset=utf-8",
	".xml": "application/xml; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".mp4": "video/mp4",
};

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
	const opts = {
		all: false,
		only: null,
		out: null,
		tolerance: 0,
		viewports: Object.keys(VIEWPORTS),
		retries: 1,
		failuresOnly: false,
		quiet: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const value = () => argv[++i];
		if (arg === "--all") opts.all = true;
		else if (arg === "--only") opts.only = value().split(",").map(s => s.trim()).filter(Boolean);
		else if (arg === "--out") opts.out = value();
		else if (arg === "--tolerance") opts.tolerance = Number(value());
		else if (arg === "--viewports") opts.viewports = value().split(",").map(s => s.trim()).filter(Boolean);
		else if (arg === "--retries") opts.retries = Number(value());
		else if (arg === "--failures-only") opts.failuresOnly = true;
		else if (arg === "--quiet") opts.quiet = true;
		else if (arg === "-h" || arg === "--help") {
			console.log(`
Usage: npm run visual [options]

  --all               check every <loc> in _site/sitemap.xml (slow)
  --only <paths>      comma separated paths to check, e.g. /,/tag/AI/
                      (default: one post page + one tag page, picked from the sitemap)
  --out <dir>         screenshot directory (default: <tmpdir>/blog-visual-<ts>)
  --tolerance <n>     mismatched pixels tolerated per screenshot (default 0)
  --viewports <list>  ${Object.keys(VIEWPORTS).join(",")} (default: all)
  --retries <n>       re-shoot a mismatching page before failing it (default 1)
  --failures-only     only print pages that differ
  --quiet             only print the final summary

Env:
  LIVE_ORIGIN         origin holding the live site (default ${LIVE_ORIGIN})
  CHROME_PATH         path to the Chrome/Chromium binary to drive
`);
			process.exit(0);
		} else {
			console.error(`Unknown option: ${arg} (try --help)`);
			process.exit(2);
		}
	}
	for (const vp of opts.viewports) {
		if (!VIEWPORTS[vp]) {
			console.error(`Unknown viewport "${vp}" (expected ${Object.keys(VIEWPORTS).join(", ")})`);
			process.exit(2);
		}
	}
	return opts;
}

// ------------------------------------------------------------ static server

async function serveSite() {
	const root = normalize(SITE_DIR);
	const server = createServer(async (req, res) => {
		try {
			const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
			let filePath = join(root, urlPath);
			if (!normalize(filePath).startsWith(root)) {
				res.writeHead(403).end();
				return;
			}
			const info = await stat(filePath).catch(() => null);
			if (info?.isDirectory()) filePath = join(filePath, "index.html");
			const body = await stat(filePath).catch(() => null);
			if (!body?.isFile()) {
				res.writeHead(404, { "content-type": "text/plain" }).end("not found");
				return;
			}
			res.writeHead(200, {
				"content-type": MIME[extname(filePath)] ?? "application/octet-stream",
				"content-length": body.size,
			});
			createReadStream(filePath).pipe(res);
		} catch (error) {
			res.writeHead(500, { "content-type": "text/plain" }).end(String(error));
		}
	});
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

// --------------------------------------------------------------- screenshot

async function screenshot(browser, origin, path, viewport, { localOrigin }) {
	const context = await browser.newContext({
		viewport: { width: viewport.width, height: viewport.height },
		deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
		isMobile: viewport.isMobile ?? false,
		hasTouch: viewport.hasTouch ?? false,
	});
	// Block third-party resources on both sides so layout is deterministic.
	await context.route("**/*", route => {
		const url = route.request().url();
		if (url.startsWith(localOrigin) || url.startsWith(LIVE_ORIGIN) || url.startsWith("data:")) return route.continue();
		return route.abort();
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", error => errors.push(String(error)));
	let status = null;
	try {
		const response = await page.goto(origin + path, { waitUntil: "load", timeout: 60000 });
		status = response?.status() ?? null;
		// Wait for webfonts, then for the document height to stop changing. Without
		// this, late reflow (async embeds, font swap) produces stray mismatched pixels.
		await page.evaluate(() => document.fonts?.ready);
		let lastHeight = -1;
		let stable = 0;
		for (let attempt = 0; attempt < 40; attempt++) {
			const height = await page.evaluate(() => document.documentElement.scrollHeight);
			if (height === lastHeight) stable++;
			else {
				stable = 0;
				lastHeight = height;
			}
			if (stable >= 3) break;
			await page.waitForTimeout(150);
		}

		// Capture in a single pass. Chrome stitches `fullPage` captures out of
		// viewport-sized tiles, and on tall pages the tile boundaries land on
		// different subpixel offsets between runs — that alone produced ~50 stray
		// antialiased pixels per run. Growing the viewport to the page height makes
		// it one tile, which is deterministic. Falls back to `fullPage` for pages
		// taller than any sane viewport.
		let buffer;
		const pageHeight = lastHeight;
		if (pageHeight > 0 && pageHeight <= MAX_SINGLE_PASS_HEIGHT) {
			await page.setViewportSize({ width: viewport.width, height: pageHeight });
			await page.waitForTimeout(150);
			const grown = await page.evaluate(() => document.documentElement.scrollHeight);
			if (Math.abs(grown - pageHeight) > 2) {
				buffer = await page.screenshot({ fullPage: true, animations: "disabled" });
			} else {
				buffer = await page.screenshot({ animations: "disabled" });
			}
		} else {
			buffer = await page.screenshot({ fullPage: true, animations: "disabled" });
		}
		return { buffer, errors, status };
	} finally {
		await context.close();
	}
}

// --------------------------------------------------------------- pixel diff

/** Returns { identical } or { diff, total, yRange } plus a diff-mask PNG. */
async function pixelDiff(browser, a, b) {
	const context = await browser.newContext();
	const page = await context.newPage();
	try {
		const result = await page.evaluate(async ([aSrc, bSrc]) => {
			const load = src => new Promise((resolve, reject) => {
				const image = new Image();
				image.onload = () => resolve(image);
				image.onerror = reject;
				image.src = src;
			});
			const [imgA, imgB] = await Promise.all([load(aSrc), load(bSrc)]);
			if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
				return { dims: { local: [imgA.width, imgA.height], live: [imgB.width, imgB.height] } };
			}
			const pixels = img => {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctxt = canvas.getContext("2d");
				ctxt.drawImage(img, 0, 0);
				return ctxt.getImageData(0, 0, img.width, img.height);
			};
			const dataA = pixels(imgA);
			const dataB = pixels(imgB);
			const mask = document.createElement("canvas");
			mask.width = imgA.width;
			mask.height = imgA.height;
			const maskCtxt = mask.getContext("2d");
			const maskData = maskCtxt.createImageData(imgA.width, imgA.height);
			let diff = 0;
			let minY = Infinity;
			let maxY = -1;
			for (let y = 0; y < imgA.height; y++) {
				for (let x = 0; x < imgA.width; x++) {
					const i = (y * imgA.width + x) * 4;
					const same = dataA.data[i] === dataB.data[i]
						&& dataA.data[i + 1] === dataB.data[i + 1]
						&& dataA.data[i + 2] === dataB.data[i + 2];
					if (same) {
						const lum = 255 - dataA.data[i] * 0.3 - dataA.data[i + 1] * 0.6 - dataA.data[i + 2] * 0.1;
						const faded = 255 - lum * 0.85;
						maskData.data[i] = faded;
						maskData.data[i + 1] = faded;
						maskData.data[i + 2] = faded;
					} else {
						diff++;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
						maskData.data[i] = 255;
						maskData.data[i + 1] = 0;
						maskData.data[i + 2] = 64;
					}
					maskData.data[i + 3] = 255;
				}
			}
			maskCtxt.putImageData(maskData, 0, 0);
			return { diff, total: imgA.width * imgA.height, yRange: [minY, maxY], mask: mask.toDataURL("image/png") };
		}, [a, b]);
		if (result.mask) result.mask = Buffer.from(result.mask.split(",")[1], "base64");
		return result;
	} finally {
		await context.close();
	}
}

// ------------------------------------------------------------------- driver

const dataUrl = buffer => "data:image/png;base64," + buffer.toString("base64");
const slug = path => (path === "/" ? "home" : path.replace(/^\/|\/$/g, "").replace(/\//g, "_"));

async function readPaths(opts) {
	if (opts.only) return opts.only;
	const xml = await readFile(join(SITE_DIR, "sitemap.xml"), "utf8").catch(() => null);
	if (!xml) {
		console.error(`Cannot read ${SITE_DIR}/sitemap.xml — run \`npm run build\` first.`);
		process.exit(2);
	}
	const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
		.map(match => match[1].replace(SITE_ORIGIN_FOR_URLS, ""))
		.map(path => (path === "" ? "/" : path));
	if (opts.all) return all;

	// Default: the page types that actually change shape when a template,
	// component, or stylesheet moves — a post and a tag listing. The sitemap
	// lists posts oldest first, so the last one is the newest post.
	const sample = [
		all.filter(path => /^\/[^/]+\/$/.test(path)).at(-1),
		all.find(path => /^\/tag\/[^/]+\/$/.test(path) && path !== "/tag/all/"),
	].filter(Boolean);
	if (sample.length === 0) {
		console.error("Could not pick a sample post/tag page from the sitemap; use --only or --all.");
		process.exit(2);
	}
	return sample;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const paths = await readPaths(opts);
	const outDir = opts.out ?? join(tmpdir(), `blog-visual-${new Date().toISOString().replace(/[:.]/g, "-")}`);
	await mkdir(outDir, { recursive: true });

	const { server, origin } = await serveSite();
	const browser = await chromium.launch({ channel: process.env.CHROME_PATH ? undefined : "chrome", executablePath: process.env.CHROME_PATH });
	const localOrigin = origin;

	console.log(`Local:  ${origin}`);
	console.log(`Live:   ${LIVE_ORIGIN}`);
	console.log(`Pages:  ${paths.length}   Viewports: ${opts.viewports.join(", ")}   Tolerance: ${opts.tolerance}px`);
	console.log(`Output: ${outDir}\n`);

	const rows = [];
	try {
		for (const path of paths) {
			for (const viewportName of opts.viewports) {
				const viewport = VIEWPORTS[viewportName];
				const name = `${slug(path)}-${viewportName}`;
				// Full-page captures of very tall pages are occasionally off by a few
				// antialiased pixels (tile stitching on the live side). A genuine build
				// change fails every time, so re-shoot once before calling it a failure.
				let attempt = 0;
				let row;
				while (true) {
					attempt++;
					const local = await screenshot(browser, localOrigin, path, viewport, { localOrigin });
					const live = await screenshot(browser, LIVE_ORIGIN, path, viewport, { localOrigin });

					let result;
					if (local.buffer.equals(live.buffer)) {
						result = { identical: true, diff: 0 };
					} else {
						result = await pixelDiff(browser, dataUrl(local.buffer), dataUrl(live.buffer));
					}

					const ok = result.identical || (result.diff ?? Infinity) <= opts.tolerance;
					row = { path, viewport: viewportName, name, ok, attempts: attempt, status: { local: local.status, live: live.status }, errors: [...local.errors, ...live.errors], ...result };
					if (ok || attempt > opts.retries) {
						await writeFile(join(outDir, `${name}-local.png`), local.buffer);
						await writeFile(join(outDir, `${name}-live.png`), live.buffer);
						if (result.mask) await writeFile(join(outDir, `${name}-diff.png`), result.mask);
						break;
					}
				}

				rows.push(row);
				if (!opts.quiet && (!opts.failuresOnly || !row.ok)) {
					const state = row.identical ? "identical" : `${row.diff} px differ${row.dims ? ` (${row.dims.local.join("x")} vs ${row.dims.live.join("x")})` : row.yRange ? ` at y=${row.yRange[0]}-${row.yRange[1]}` : ""}`;
					const retried = row.attempts > 1 && row.ok ? "  (matched on retry)" : "";
					console.log(`${row.ok ? "ok  " : "FAIL"} ${path.padEnd(58)} [${viewportName.padEnd(7)}] ${state}${retried}${row.errors.length ? "  JS error: " + row.errors[0] : ""}`);
				}
				if (row.status.local !== row.status.live) row.ok = false;
			}
		}
	} finally {
		await browser.close();
		server.close();
	}

	const failures = rows.filter(row => !row.ok);
	const summary = {
		checkedAt: new Date().toISOString(),
		liveOrigin: LIVE_ORIGIN,
		tolerance: opts.tolerance,
		retries: opts.retries,
		comparisons: rows.length,
		failed: failures.length,
		failures: failures.map(({ path, viewport, diff, dims, yRange, status, errors }) => ({ path, viewport, diff, dims, yRange, status, errors })),
	};
	await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");

	console.log(`\n${rows.length} comparisons, ${failures.length} failed. Screenshots + summary.json in ${outDir}`);
	if (failures.length) {
		console.log("\nInspect: <name>-local.png vs <name>-live.png, and <name>-diff.png (red = differing pixels).");
		process.exitCode = 1;
	}
}

main().catch(error => {
	console.error(error?.message ?? error);
	process.exit(1);
});
