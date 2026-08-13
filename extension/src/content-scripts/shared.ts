import MoodlePage from "@/models/MoodlePage"
import { PageScanResultMessage } from "@/types"
import { COMMANDS } from "@shared/constants"

function sendScanResults(page: MoodlePage) {
  chrome.runtime.sendMessage({
    command: COMMANDS.SCAN_RESULT,
    resources: page.resources,
    activities: page.activities,
  } satisfies PageScanResultMessage)
}

export { sendScanResults }
