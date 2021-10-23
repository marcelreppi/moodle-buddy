import { computed, ComputedRef, Ref, ref } from "vue"
import { Message, VideoServiceResource, VideoScanResultMessage, SelectionTab } from "types"
import { sendEvent } from "../../shared/helpers"

interface VideoserviceData {
  nVideos: Ref<number>
  videoResources: Ref<VideoServiceResource[]>
  downloadVideos: Ref<boolean>
  selectedResources: ComputedRef<VideoServiceResource[]>
  disableVideoCb: ComputedRef<boolean>
  onDownload: () => void
  scanResultHandler: (message: Message) => void
}

export default function useVideoserviceData(selectionTab: Ref<SelectionTab>): VideoserviceData {
  const nVideos = ref(0)
  const videoResources = ref<VideoServiceResource[]>([])
  const downloadVideos = ref(true)

  const selectedResources = computed(() => {
    return videoResources.value.filter((n) => {
      if (selectionTab.value.id === "simple") {
        return true
      }

      if (selectionTab.value.id === "detailed") {
        return n.selected
      }

      return false
    })
  })

  const disableVideoCb = computed(() => nVideos.value === 0)

  const onDownload = () => {
    const eventParts = ["download-videoservice-page", selectionTab.value]
    sendEvent(eventParts.join("-"), true, { numberOfFiles: selectedResources.value.length })
  }

  const scanResultHandler = (message: Message) => {
    const { videoResources: scannedVideoResources } = message as VideoScanResultMessage
    nVideos.value = scannedVideoResources.length
    videoResources.value = scannedVideoResources.map((r) => {
      return { ...r, selected: false, isFile: true }
    })
  }

  return {
    nVideos,
    videoResources,
    downloadVideos,
    disableVideoCb,
    selectedResources,
    onDownload,
    scanResultHandler,
  }
}
