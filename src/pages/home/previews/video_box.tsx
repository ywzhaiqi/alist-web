import {
  Flex,
  VStack,
  Image,
  Anchor,
  Tooltip,
  HStack,
  Switch,
} from "@hope-ui/solid"
import { For, JSXElement } from "solid-js"
import { useRouter, useLink, useT } from "~/hooks"
import { objStore } from "~/store"
import { ObjType, StoreObj } from "~/types"
import { convertURL } from "~/utils"
import Artplayer from "artplayer"
import { SelectWrapper } from "~/components"

Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

export const players: {
  icon: string
  name: string
  scheme: string
  pls?: boolean
}[] = [
  { icon: "iina", name: "IINA", scheme: "iina://weblink?url=$durl" },
  { icon: "potplayer", name: "PotPlayer", scheme: "potplayer://$durl" },
  { icon: "potplayer", name: "播放列表", pls: true, scheme: "" },
  { icon: "vlc", name: "VLC", scheme: "vlc://$durl" },
  { icon: "nplayer", name: "nPlayer", scheme: "nplayer-$durl" },
  {
    icon: "infuse",
    name: "Infuse",
    scheme: "infuse://x-callback-url/play?url=$durl",
  },
  {
    icon: "mxplayer",
    name: "MX Player",
    scheme:
      "intent:$durl#Intent;package=com.mxtech.videoplayer.ad;S.title=$name;end",
  },
  {
    icon: "mxplayer-pro",
    name: "MX Player Pro",
    scheme:
      "intent:$durl#Intent;package=com.mxtech.videoplayer.pro;S.title=$name;end",
  },
]

function createPlsLink(videos: StoreObj[], rawLink: Function): string {
  const text = `[playlist]\nNumberOfEntries=${videos.length}
${videos.map((v, i) => `File${i + 1}=${rawLink(v, true)}`).join("\n")}`

  const textBlob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(textBlob)
  return url
}

export const VideoBox = (props: {
  children: JSXElement
  onAutoNextChange: (v: boolean) => void
}) => {
  const { replace } = useRouter()
  const { currentObjLink, rawLink } = useLink()
  let videos = objStore.objs.filter((obj) => obj.type === ObjType.VIDEO)
  if (videos.length === 0) {
    videos = [objStore.obj]
  }
  const t = useT()
  let autoNext = localStorage.getItem("video_auto_next")
  if (!autoNext) {
    autoNext = "true"
  }
  props.onAutoNextChange(autoNext === "true")
  return (
    <VStack w="$full" spacing="$2">
      {props.children}
      <HStack spacing="$2" w="$full">
        <SelectWrapper
          onChange={(name: string) => {
            replace(name)
          }}
          value={objStore.obj.name}
          options={videos.map((obj) => ({ value: obj.name }))}
        />
        <Switch
          css={{
            whiteSpace: "nowrap",
          }}
          defaultChecked={autoNext === "true"}
          onChange={(e) => {
            props.onAutoNextChange(e.currentTarget.checked)
            localStorage.setItem(
              "video_auto_next",
              e.currentTarget.checked.toString(),
            )
          }}
        >
          {t("home.preview.auto_next")}
        </Switch>
      </HStack>
      <Flex wrap="wrap" gap="$1" justifyContent="center">
        <For each={players}>
          {(item) => {
            return (
              <Tooltip placement="top" withArrow label={item.name}>
                <Anchor
                  // external
                  href={
                    item.pls
                      ? createPlsLink(videos, rawLink)
                      : convertURL(item.scheme, {
                          raw_url: objStore.raw_url,
                          name: objStore.obj.name,
                          d_url: currentObjLink(true),
                        })
                  }
                  download={item.pls ? "alist播放列表.pls" : ""}
                >
                  <Image
                    m="0 auto"
                    boxSize="$8"
                    src={`${window.__dynamic_base__}/images/${item.icon}.webp`}
                  />
                </Anchor>
              </Tooltip>
            )
          }}
        </For>
      </Flex>
    </VStack>
  )
}
