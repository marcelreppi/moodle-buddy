import { COMMANDS } from "@shared/constants"
import { ExtensionOptions, ExtensionStorage, FeedbackMessage } from "types"

document.querySelector("#form-button")?.addEventListener("click", async () => {
  const email = document.querySelector<HTMLInputElement>("#form-email")?.value
  const platform = document.querySelector<HTMLInputElement>("#form-platform")?.value
  const subject = document.querySelector<HTMLInputElement>("#form-subject")?.value
  const content = document.querySelector<HTMLTextAreaElement>("#form-content")?.value

  if (subject && content && platform) {
    const { options, browserId } = (await chrome.storage.local.get()) as ExtensionStorage
    const { defaultMoodleURL }: ExtensionOptions = options

    const message = [
      `E-Mail: ${email}`,
      `Moodle platform: ${platform}`,
      `Browser ID: ${browserId}`,
      `Moodle URL: ${defaultMoodleURL}`,
      content,
    ].join("\n\n")

    chrome.runtime.sendMessage({
      command: COMMANDS.FEEDBACK,
      feedbackData: { subject, content: message },
    } satisfies FeedbackMessage)

    const sectionContent = document.querySelector<HTMLDivElement>(".section-content")
    if (sectionContent) sectionContent.style.display = "none"

    const successMessage = document.querySelector<HTMLDivElement>(".success")
    if (successMessage) successMessage.style.display = "flex"
  } else {
    const missingHint = document.querySelector<HTMLDivElement>(".missing")
    if (missingHint) missingHint.style.display = "block"
  }
})

const versionSpan = document.querySelector<HTMLSpanElement>("#version")
if (versionSpan) {
  versionSpan.textContent = `(v. ${chrome.runtime.getManifest().version})`
}
