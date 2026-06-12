const KB = 1024
const MAX_AVATAR_SIZE = 2 * KB * KB

export function validateAvatarFile(file: File): { ok: true } | { ok: false; error: string } {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: `不支持的文件类型: ${file.type}。支持 JPG/PNG/WebP/GIF` }
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { ok: false, error: `文件过大 (${(file.size / KB / KB).toFixed(1)}MB)，请小于 2MB` }
  }
  return { ok: true }
}

export function readAvatarFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("文件读取失败"))
    reader.readAsDataURL(file)
  })
}
