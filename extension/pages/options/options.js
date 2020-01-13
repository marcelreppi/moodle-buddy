const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/

function onError(error) {
  const errorNode = document.querySelector(".error")
  errorNode.textContent = `Error: ${error}`
  errorNode.classList.add("show")
  setTimeout(() => {
    document.querySelector(".error").classList.remove("show")
  }, 3000)
}

function onSuccess() {
  document.querySelector(".success").classList.add("show")
  setTimeout(() => {
    document.querySelector(".success").classList.remove("show")
  }, 3000)
}

function restore() {
  browser.storage.local.get("options").then(({ options = {} }) => {
    const inputs = document.querySelectorAll("input")
    inputs.forEach(input => {
      switch (input.type) {
        case "text":
          input.value = options[input.id]
          break
        case "checkbox":
          input.checked = options[input.id]
          break
        default:
          break
      }
    })
  }, onError)
}

async function save(e) {
  e.preventDefault()
  let error = false
  const updatedOptions = {}
  const inputs = document.querySelectorAll("input")
  inputs.forEach(input => {
    switch (input.type) {
      case "text":
        if (input.id === "defaultMoodleURL") {
          if (input.value !== "" && !input.value.match(validURLRegex)) {
            error = true
            onError("Invalid URL")
          }
        }
        updatedOptions[input.id] = input.value
        break
      case "checkbox":
        updatedOptions[input.id] = input.checked
        break
      default:
        break
    }
  })

  if (error) return

  if (updatedOptions.disableInteractionTracking) {
    await browser.runtime.sendMessage({
      command: "event",
      event: "disable-tracking",
    })
  }
  browser.storage.local
    .set({
      options: updatedOptions,
    })
    .then(onSuccess, onError)
}

document.addEventListener("DOMContentLoaded", restore)
document.querySelector("form").addEventListener("submit", save)
