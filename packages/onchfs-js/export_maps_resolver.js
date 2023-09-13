const resolver = require("enhanced-resolve").create.sync({
  conditionNames: ["import", "node", "default"],
  extensions: [".js", ".json", ".node", ".ts"],
})

module.exports = function (request, options) {
  if (request !== "multiformats/cid") {
    return options.defaultResolver(request, options)
  }
  return resolver(options.basedir, request)
}
