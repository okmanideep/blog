const webcPlugin = require("@11ty/eleventy-plugin-webc")
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

function readableDate(dateString) {
  let d = new Date(dateString)
  // d.toString() = Fri Apr 01 2022 23:30:00 GMT+0530 (India Standard Time)
  // 👇 gives Fri, Apr 01 2022
  return d.toString().replace(/(^[A-z,a-z]{3})(.*20\d\d).*$/, '$1,$2')
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("img")

  eleventyConfig.addShortcode("img", imgShortcode)

  eleventyConfig.addFilter("imgPath", imgPath)
  eleventyConfig.addFilter("cssmin", minifyCss)
  eleventyConfig.addFilter("readableDate", readableDate)

  eleventyConfig.addPlugin(webcPlugin)
  eleventyConfig.addPlugin(syntaxHighlight)
}
