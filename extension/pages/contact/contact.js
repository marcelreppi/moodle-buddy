document.querySelector("#form-button").addEventListener("click", async () => {
  const email = document.querySelector("#form-email").value
  const platform = document.querySelector("#form-platform").value
  const subject = document.querySelector("#form-subject").value
  const content = document.querySelector("#form-content").value

  if (subject !== "" && content !== "" && platform !== "") {
    const { options, browserId } = await browser.storage.local.get()
    const { defaultMoodleURL } = options

    const message = [
      `E-Mail: ${email}`,
      `Moodle platform: ${platform}`,
      `Browser ID: ${browserId}`,
      `Moodle URL: ${defaultMoodleURL}`,
      content,
    ].join("\n\n")

    browser.runtime.sendMessage({
      command: "feedback",
      feedbackData: { subject, content: message },
    })

    document.querySelector(".section-content").style.display = "none"
    document.querySelector(".success").style.display = "flex"
  } else {
    document.querySelector(".missing").style.display = "block"
  }
})

document.querySelector("#version").textContent = `(v. ${browser.runtime.getManifest().version})`
