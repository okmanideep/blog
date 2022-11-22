const CleanCSS = require("clean-css")
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight")

function imgShortcode(src, alt) {
  return `<img src="${imgPath(src)}" alt="${alt}" />`
}

function imgPath(filename) {
  return `/img/${filename}`
}

function minifyCss(code) {
  return new CleanCSS({}).minify(code).styles
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("img")

  eleventyConfig.addShortcode("img", imgShortcode)

  eleventyConfig.addFilter("imgPath", imgPath)
  eleventyConfig.addFilter("cssmin", minifyCss)

  eleventyConfig.addPlugin(syntaxHighlight)
}
