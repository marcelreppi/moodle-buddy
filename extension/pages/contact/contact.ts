import { ExtensionOptions, ExtensionStorage, FeedbackMessage } from "moodle-buddy-types"

document.querySelector("#form-button")?.addEventListener("click", async () => {
  const email = document.querySelector<HTMLInputElement>("#form-email")?.value
  const platform = document.querySelector<HTMLInputElement>("#form-platform")?.value
  const subject = document.querySelector<HTMLInputElement>("#form-subject")?.value
  const content = document.querySelector<HTMLTextAreaElement>("#form-content")?.value

  if (subject && content && platform) {
    const { options, browserId }: ExtensionStorage = await browser.storage.local.get()
    const { defaultMoodleURL }: ExtensionOptions = options

    const message = [
      `E-Mail: ${email}`,
      `Moodle platform: ${platform}`,
      `Browser ID: ${browserId}`,
      `Moodle URL: ${defaultMoodleURL}`,
      content,
    ].join("\n\n")

    browser.runtime.sendMessage<FeedbackMessage>({
      command: "feedback",
      feedbackData: { subject, content: message },
    })

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
  versionSpan.textContent = `(v. ${browser.runtime.getManifest().version})`
}
