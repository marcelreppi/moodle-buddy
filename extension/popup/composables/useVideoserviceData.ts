import { computed, ComputedRef, Ref, ref } from "vue"
import { Message, SelectionTab, VideoResource, VideoScanResultMessage } from "moodle-buddy-types"
import { sendEvent } from "../../shared/helpers"

interface VideoserviceData {
  nVideos: Ref<number>
  videoResources: Ref<VideoResource[]>
  downloadVideos: Ref<boolean>
  selectedResources: ComputedRef<VideoResource[]>
  disableVideoCb: ComputedRef<boolean>
  onDownload: () => void
  scanResultHandler: (message: Message) => void
}

export default function useVideoserviceData(selectionTab: Ref<SelectionTab>): VideoserviceData {
  const nVideos = ref(0)
  const videoResources = ref<VideoResource[]>([])
  const downloadVideos = ref(true)

  const selectedResources = computed(() => {
    return videoResources.value.filter(n => {
      if (selectionTab.value === "simple") {
        return true
      }

      if (selectionTab.value === "detailed") {
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
    videoResources.value = scannedVideoResources.map(r => {
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
