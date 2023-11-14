import { objStore, selectedObjs, State, me } from "~/store"
import { Obj, ObjType } from "~/types"
import { api, encodePath, pathDir, pathJoin, standardizePath } from "~/utils"
import { useRouter, useUtil } from "."

type URLType = "preview" | "direct" | "proxy"

// get download url by dir and obj
export const getLinkByDirAndObj = (
  dir: string,
  obj: Obj,
  type: URLType = "direct",
  encodeAll?: boolean,
) => {
  if (type !== "preview") {
    dir = pathJoin(me().base_path, dir)
  }
  dir = standardizePath(dir, true)
  let path = `${dir}/${obj.name}`
  path = encodePath(path, encodeAll)
  let host = api
  let prefix = type === "direct" ? "/d" : "/p"
  if (type === "preview") {
    prefix = ""
    if (!api.startsWith(location.origin)) host = location.origin
  }
  let ans = `${host}${prefix}${path}`
  if (type !== "preview" && obj.sign) {
    ans += `?sign=${obj.sign}`
  }
  return ans
}

// get download link by current state and pathname
export const useLink = () => {
  const { pathname } = useRouter()
  const getLinkByObj = (obj: Obj, type?: URLType, encodeAll?: boolean) => {
    const dir = objStore.state !== State.File ? pathname() : pathDir(pathname())
    return getLinkByDirAndObj(dir, obj, type, encodeAll)
  }
  const rawLink = (obj: Obj, encodeAll?: boolean) => {
    return getLinkByObj(obj, "direct", encodeAll)
  }
  return {
    getLinkByObj: getLinkByObj,
    rawLink: rawLink,
    proxyLink: (obj: Obj, encodeAll?: boolean) => {
      return getLinkByObj(obj, "proxy", encodeAll)
    },
    previewPage: (obj: Obj, encodeAll?: boolean) => {
      return getLinkByObj(obj, "preview", encodeAll)
    },
    currentObjLink: (encodeAll?: boolean) => {
      return rawLink(objStore.obj, encodeAll)
    },
    createPlsLink(startName?: string): string {
      let videos = objStore.objs.filter((obj) => obj.type === ObjType.VIDEO)
      if (videos.length === 0) {
        videos = [objStore.obj]
      }

      if (startName) {
        const startIndex = videos.findIndex((v) => v.name === startName)
        if (startIndex !== -1) {
          videos = videos.slice(startIndex)
        }
      }

      const text = `[playlist]
NumberOfEntries=${videos.length}
${videos.map((v, i) => `File${i + 1}=${rawLink(v, true)}`).join("\n")}`

      const textBlob = new Blob([text], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(textBlob)
      return url
    },
  }
}

export const useSelectedLink = () => {
  const { previewPage, rawLink: rawUrl } = useLink()
  const rawLinks = (encodeAll?: boolean) => {
    return selectedObjs()
      .filter((obj) => !obj.is_dir)
      .map((obj) => rawUrl(obj, encodeAll))
  }
  return {
    rawLinks: rawLinks,
    previewPagesText: () => {
      return selectedObjs()
        .map((obj) => previewPage(obj, true))
        .join("\n")
    },
    rawLinksText: (encodeAll?: boolean) => {
      return rawLinks(encodeAll).join("\n")
    },
  }
}

export const useCopyLink = () => {
  const { copy } = useUtil()
  const { previewPagesText, rawLinksText } = useSelectedLink()
  const { currentObjLink } = useLink()
  return {
    copySelectedPreviewPage: () => {
      copy(previewPagesText())
    },
    copySelectedRawLink: (encodeAll?: boolean) => {
      copy(rawLinksText(encodeAll))
    },
    copyCurrentRawLink: (encodeAll?: boolean) => {
      copy(currentObjLink(encodeAll))
    },
  }
}
