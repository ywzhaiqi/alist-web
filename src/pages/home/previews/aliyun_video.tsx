import { Box } from "@hope-ui/solid"
import { createSignal, onCleanup, onMount } from "solid-js"
import { useRouter, useLink, useFetch } from "~/hooks"
import { getSettingBool, objStore, password } from "~/store"
import { ObjType, PResp } from "~/types"
import { ext, handleResp, notify, r } from "~/utils"
import Artplayer from "artplayer"
import artplayerPluginDanmuku from "artplayer-plugin-danmuku"
import Hls from "hls.js"
import { currentLang } from "~/app/i18n"
import { VideoBox } from "./video_box"
import { useDropZone, useLocalStorage, useObjectUrl } from "solidjs-use"

export interface Data {
  drive_id: string
  file_id: string
  video_preview_play_info: VideoPreviewPlayInfo
}

export interface VideoPreviewPlayInfo {
  category: string
  live_transcoding_task_list: LiveTranscodingTaskList[]
  meta: Meta
}

export interface LiveTranscodingTaskList {
  stage: string
  status: string
  template_height: number
  template_id: string
  template_name: string
  template_width: number
  url: string
}

export interface Meta {
  duration: number
  height: number
  width: number
}

const Preview = () => {
  const { replace, pathname } = useRouter()
  const { proxyLink } = useLink()
  const [state, setState] = useLocalStorage("aliyun_video", {
    quality: {
      default: -1,
    },
  })

  let videos = objStore.objs.filter((obj) => obj.type === ObjType.VIDEO)
  if (videos.length === 0) {
    videos = [objStore.obj]
  }
  let player: Artplayer
  let option: any = {
    id: pathname(),
    container: "#video-player",
    title: objStore.obj.name,
    volume: 0.5,
    autoplay: getSettingBool("video_autoplay"),
    autoSize: false,
    autoMini: true,
    loop: false,
    flip: true,
    playbackRate: true,
    aspectRatio: true,
    setting: true,
    hotkey: true,
    pip: true,
    mutex: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: true,
    miniProgressBar: false,
    playsInline: true,
    quality: [],
    plugins: [],
    whitelist: [],
    moreVideoAttr: {
      // @ts-ignore
      "webkit-playsinline": true,
      playsInline: true,
    },
    type: "m3u8",
    customType: {
      m3u8: function (video: HTMLMediaElement, url: string) {
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
        if (!video.src) {
          video.src = url
        }
      },
    },
    lang: ["en", "zh-cn", "zh-tw"].includes(currentLang().toLowerCase())
      ? (currentLang().toLowerCase() as any)
      : "en",
    lock: true,
    fastForward: true,
    autoPlayback: true,
    autoOrientation: true,
    airplay: true,
  }

  const subtitle = objStore.related.find((obj) => {
    for (const ext of [".srt", ".ass", ".vtt"]) {
      if (obj.name.endsWith(ext)) {
        return true
      }
    }
    return false
  })
  const danmu = objStore.related.find((obj) => {
    for (const ext of [".xml"]) {
      if (obj.name.endsWith(ext)) {
        return true
      }
    }
    return false
  })
  if (subtitle) {
    option.subtitle = {
      url: proxyLink(subtitle, true),
      type: ext(subtitle.name) as any,
    }
  }
  if (danmu) {
    option.plugins = [
      artplayerPluginDanmuku({
        danmuku: proxyLink(danmu, true),
        speed: 5,
        opacity: 1,
        fontSize: 25,
        color: "#FFFFFF",
        mode: 0,
        margin: [0, "0%"],
        antiOverlap: false,
        useWorker: true,
        synchronousPlayback: false,
        lockTime: 5,
        maxLength: 100,
        minWidth: 200,
        maxWidth: 400,
        theme: "dark",
      }),
    ]
  }
  const [loading, post] = useFetch(
    (): PResp<Data> =>
      r.post("/fs/other", {
        path: pathname(),
        password: password(),
        method: "video_preview",
      }),
  )
  onMount(async () => {
    const resp = await post()
    handleResp(resp, (data) => {
      const list =
        data.video_preview_play_info.live_transcoding_task_list.filter(
          (l) => l.url,
        )
      if (list.length === 0) {
        notify.error("No transcoding video found")
        return
      }
      option.url = list[list.length - 1].url
      const defaultIndex =
        state().quality.default >= 0 && state().quality.default < list.length
          ? state().quality.default
          : list.length - 1
      option.quality = list.map((item, i) => {
        return {
          html: item.template_id,
          url: item.url,
          default: i === defaultIndex,
        }
      })
      player = new Artplayer(option)
      player.on("video:ended", () => {
        if (!autoNext()) return
        const index = videos.findIndex((f) => f.name === objStore.obj.name)
        if (index < videos.length - 1) {
          replace(videos[index + 1].name)
        }
      })
      // Fixed subtitle loss when switching videos with different resolutions
      if (subtitle) {
        player.on("video:play", (_url) => {
          player.subtitle.url = proxyLink(subtitle, true)
        })
      }
      // 保存 quality
      player.on("video:loadedmetadata", () => {
        const qualityOption = player.option.quality
        if (qualityOption) {
          const qualityHtml = player.query(".art-selector-value")?.textContent
          const newIndex = qualityOption.findIndex(
            (item) => item.html === qualityHtml,
          )
          if (newIndex != state().quality.default) {
            setState({ quality: { default: newIndex } })
          }
        }
      })
      // add next button
      const index = videos.findIndex((f) => f.name === objStore.obj.name)
      const nextIndex = index + 1
      if (nextIndex <= videos.length - 1) {
        const toNextVideo = () => {
          replace(videos[nextIndex].name)
        }
        player.controls.add({
          name: "next",
          index: 11,
          position: "left",
          html: `<i class="art-icon art-icon-play hint--rounded hint--top" aria-label="下一个" style="display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg"  height="22" width="22">
              <path d="M16 5a1 1 0 0 0-1 1v4.615a1.431 1.431 0 0 0-.615-.829L7.21 5.23A1.439 1.439 0 0 0 5 6.445v9.11a1.44 1.44 0 0 0 2.21 1.215l7.175-4.555a1.436 1.436 0 0 0 .616-.828V16a1 1 0 0 0 2 0V6C17 5.448 16.552 5 16 5z"></path>
            </svg>
          </i>`,
          tooltip: "下一个 (])",
          click: toNextVideo,
        })
        const next_keyCode = 221 // ]
        player.hotkey.add(next_keyCode, toNextVideo)
      }
    })
  })
  onCleanup(() => {
    player?.destroy()
  })
  const [autoNext, setAutoNext] = createSignal()

  const [dropZoneRef, setDropZoneRef] = createSignal<HTMLDivElement>()
  const { isOverDropZone } = useDropZone(dropZoneRef, onDrop)
  const [file, setFile] = createSignal<File | undefined>()
  const subtitleUrl = useObjectUrl(file)

  function onDrop(files: File[] | null) {
    if (!files) return
    const file = files[0]

    if (!file.name.match(/\.(srt|ass|vtt)$/)) return

    setFile(file)
    player.subtitle.switch(subtitleUrl()!, {
      type: ext(file.name),
    })
  }
  return (
    <Box ref={setDropZoneRef} w="$full">
      <VideoBox onAutoNextChange={setAutoNext}>
        <Box w="$full" h="60vh" id="video-player" />
      </VideoBox>
    </Box>
  )
}

export default Preview
