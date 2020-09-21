document.querySelector("#form-button").addEventListener("click", async () => {
  const platform = document.querySelector("#form-platform").value
  const subject = document.querySelector("#form-subject").value
  const content = document.querySelector("#form-content").value

  if (subject !== "" && content !== "" && platform !== "") {
    const { browserId } = await browser.storage.local.get("browserId")

    const message = [`Moodle platform: ${platform}`, `Browser ID: ${browserId}`, content].join(
      "\n\n"
    )

    browser.runtime.sendMessage({
      command: "feedback",
      subject,
      content: message,
    })

    document.querySelector(".section-content").style.display = "none"
    document.querySelector(".success").style.display = "flex"
  } else {
    document.querySelector(".missing").style.display = "block"
  }
})

document.querySelector("#version").textContent = `(v. ${browser.runtime.getManifest().version})`
