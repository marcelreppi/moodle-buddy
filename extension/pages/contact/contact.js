document.querySelector("#form-button").addEventListener("click", e => {
  const subject = document.querySelector("#form-subject").value
  const content = document.querySelector("#form-content").value

  if (subject !== "" && content !== "") {
    browser.runtime.sendMessage({
      command: "feedback",
      subject,
      content,
    })

    document.querySelector(".form-container").style.display = "none"
    document.querySelector(".success").style.display = "flex"
  }
})

document.querySelector("#version").textContent = `(v. ${browser.runtime.getManifest().version})`
