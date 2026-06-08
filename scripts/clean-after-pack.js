exports.default = async function (context) {
  const path = require("path")
  const fs = require("fs")
  const appOutDir = context.appOutDir

  // 1. Strip locales - keep only zh-CN.pak and en-US.pak (fallback)
  const localesDir = path.join(appOutDir, "locales")
  if (fs.existsSync(localesDir)) {
    const files = fs.readdirSync(localesDir)
    for (const file of files) {
      if (file.endsWith(".pak") && file !== "zh-CN.pak" && file !== "en-US.pak") {
        const fp = path.join(localesDir, file)
        fs.unlinkSync(fp)
      }
    }
  }

  // 2. Remove vk_swiftshader.dll (software Vulkan, not needed on Windows)
  const vkSwiftshader = path.join(appOutDir, "vk_swiftshader.dll")
  if (fs.existsSync(vkSwiftshader)) {
    fs.unlinkSync(vkSwiftshader)
  }
}
