const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi

function onError(error) {
  const errorNode = document.querySelector(".error")
  errorNode.textContent = `Error: ${error}`
  errorNode.classList.add("show")
  setTimeout(() => {
    document.querySelector(".error").classList.remove("show")
  }, 5000)
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
        case "checkbox":
          input.checked = options[input.id]
          break
        default:
          input.value = options[input.id]
          break
      }
    })
  }, onError)
}

async function save(e) {
  e.preventDefault()
  const updatedOptions = {}
  const inputs = document.querySelectorAll("input")
  inputs.forEach(input => {
    switch (input.type) {
      case "checkbox":
        updatedOptions[input.id] = input.checked
        break
      case "number":
        updatedOptions[input.id] = parseFloat(input.value)
        break
      default:
        updatedOptions[input.id] = input.value
        break
    }
  })

  const { defaultMoodleURL } = updatedOptions
  if (defaultMoodleURL !== "" && !defaultMoodleURL.match(validURLRegex)) {
    onError("Invalid URL")
    return
  }

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
