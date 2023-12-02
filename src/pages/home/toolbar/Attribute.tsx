import {
  Button,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
  createDisclosure,
} from "@hope-ui/solid"
import { Show, createSignal, onCleanup } from "solid-js"
import { usePath, useRouter, useT } from "~/hooks"
import { password, selectedObjs as _selectedObjs } from "~/store"
import { Obj } from "~/types"
import { bus, fsList, getFileSize, pathJoin } from "~/utils"

const AttributeCalculation = (props: { onClose: () => void }) => {
  const t = useT()
  const [cur, setCur] = createSignal(t("home.package_download.initializing"))
  // 0: init
  // 1: error
  // 2: fetching structure
  // 3: fetching files
  // 4: success
  const [status, setStatus] = createSignal(0)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const selectedObjs = _selectedObjs()
  // if (!selectedObjs.length) {
  //   notify.warning(t("home.toolbar.no_selected"));
  // }
  const [count, setCount] = createSignal({ folder: 0, file: 0 })
  const [totalSize, setTotalSize] = createSignal(0)
  const [files, setFiles] = createSignal<Obj[]>([])
  const fetchFolderStructure = async (
    pre: string,
    obj: Obj,
  ): Promise<Obj[] | string> => {
    if (!obj.is_dir) {
      setCount({ ...count(), file: count().file + 1 })
      setTotalSize(totalSize() + obj.size)
      if (!obj.path) {
        obj.path = pathJoin(pathname(), pre, obj.name)
      }
      return [obj]
    } else {
      setCount({ ...count(), folder: count().folder + 1 })
      const resp = await fsList(pathJoin(pathname(), pre, obj.name), password())
      if (resp.code !== 200) {
        return resp.message
      }
      const res: Obj[] = []
      for (const _obj of resp.data.content ?? []) {
        const _res = await fetchFolderStructure(pathJoin(pre, obj.name), _obj)
        if (typeof _res === "string") {
          return _res
        } else {
          res.push(..._res)
        }
      }
      return res
    }
  }
  const run = async () => {
    setCur(t("home.attribute.fetching_struct"))
    setStatus(2)
    const fileObjs: Obj[] = []
    for (const obj of selectedObjs) {
      const res = await fetchFolderStructure("", obj)
      if (typeof res === "string") {
        setCur(`${t("home.attribute.fetching_struct_failed")}: ${res}`)
        setStatus(1)
        return res
      } else {
        fileObjs.push(...res)
      }
    }
    setStatus(3)
    setFiles(fileObjs)
    setCur(`${t("home.attribute.success")}`)
    setStatus(4)

    // refresh(undefined, true)
  }
  const exportFiles = () => {
    const text = JSON.stringify(files(), null, 2)
    const textBlob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(textBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${pathname()}.json`

    document.body.appendChild(link)
    link.click()
    URL.revokeObjectURL(url)
  }

  run()

  return (
    <>
      <ModalBody>
        <VStack w="$full" alignItems="start" spacing="$2">
          <Heading>
            {t(`home.attribute.current_status`)}: {cur()}
          </Heading>
          <p>
            {selectedObjs.length == 1
              ? selectedObjs[0].name
              : `${selectedObjs[0].name} 等文件`}
          </p>
          <p>{`${count().file}个文件，${count().folder}个文件夹`}</p>
          <p>位置：{pathname()}</p>
          <p>总大小: {getFileSize(totalSize())}</p>
          <Button onClick={exportFiles}>导出</Button>
        </VStack>
      </ModalBody>
      <Show when={[1, 4].includes(status())}>
        <ModalFooter>
          <Button colorScheme="info" onClick={props.onClose}>
            {t("global.close")}
          </Button>
        </ModalFooter>
      </Show>
    </>
  )
}

export const AttributeModal = () => {
  const t = useT()
  const handler = (name: string) => {
    if (name === "attribute") {
      onOpen()
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })
  const { isOpen, onOpen, onClose } = createDisclosure()

  return (
    <Modal
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={onClose}
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.attribute")}</ModalHeader>
        <ModalBody>
          <AttributeCalculation onClose={onClose} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
