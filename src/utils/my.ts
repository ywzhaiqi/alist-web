import { FsListResp } from "~/types"

type DirModified = {
  [key: string]: string
}
const storageKey = "folder-modified"

export const handleFsList = async (
  path: string,
  getFsList: Promise<FsListResp>,
) => {
  const rst = await getFsList

  if (rst.code === 200 && rst.data.content) {
    const dirModified = JSON.parse(
      localStorage.getItem(storageKey) || "{}",
    ) as DirModified

    // 更新
    rst.data.content.forEach((obj) => {
      if (obj.is_dir) {
        const fullPath = `${path}/${obj.name}`
        if (obj.modified < dirModified[fullPath]) {
          obj.modified = dirModified[fullPath]
        }
      }
    })

    // 获取子文件夹最大的 更新时间
    let maxModified = ""
    rst.data.content.forEach((obj) => {
      if (obj.modified > maxModified) {
        maxModified = obj.modified
      }
    })
    if (maxModified) {
      if (!dirModified[path] || dirModified[path] < maxModified) {
        dirModified[path] = maxModified
        localStorage.setItem(storageKey, JSON.stringify(dirModified))
      }
    }
  }

  return rst
}
