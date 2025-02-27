import webcPlugin from "@11ty/eleventy-plugin-webc";
import CleanCSS from "clean-css";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { EleventyRenderPlugin } from "@11ty/eleventy";
import pluginRss, { dateToRfc3339 } from "@11ty/eleventy-plugin-rss";

function imgShortcode(src, alt) {
	return `<img src="${imgPath(src)}" alt="${alt}" />`
}

function imgPath(filename) {
	return `/img/${filename}`
}

function minifyCss(code) {
	return new CleanCSS({}).minify(code).styles
}

function readableDate(dateString) {
	let d = new Date(dateString)
	// d.toString() = Fri Apr 01 2022 23:30:00 GMT+0530 (India Standard Time)
	// 👇 gives Fri, Apr 01 2022
	return d.toString().replace(/(^[A-z,a-z]{3})(.*20\d\d).*$/, '$1,$2')
}

export default function(eleventyConfig) {
	eleventyConfig.addPassthroughCopy("img")
	eleventyConfig.addPassthroughCopy("CNAME")

	eleventyConfig.addShortcode("img", imgShortcode)

	eleventyConfig.addFilter("imgPath", imgPath)
	eleventyConfig.addFilter("cssmin", minifyCss)
	eleventyConfig.addFilter("readableDate", readableDate)

	eleventyConfig.addPlugin(EleventyRenderPlugin)
	eleventyConfig.addPlugin(webcPlugin)
	eleventyConfig.addPlugin(syntaxHighlight)
	eleventyConfig.addPlugin(pluginRss);

	eleventyConfig.addLiquidFilter("dateToRfc3339", dateToRfc3339);
}
