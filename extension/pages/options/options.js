let restoredOptions = null

function restore() {
  browser.storage.local.get("options").then(({ options = {} }) => {
    restoredOptions = options
    const inputs = document.querySelectorAll("input")
    inputs.forEach(input => {
      switch (input.type) {
        case "checkbox":
          input.checked = options[input.id]
          break
        case "radio":
          input.checked = input.value === options[input.name]
          break
        default:
          input.value = options[input.id]
          break
      }
    })

    // Fake event to trigger the checkURL event callback
    document.getElementById("defaultMoodleURL").dispatchEvent(new Event("input"))
  })
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
      case "radio":
        if (input.checked) {
          updatedOptions[input.name] = input.value
        }
        break
      default:
        updatedOptions[input.id] = input.value
        break
    }
  })

  const changedOptions = {}
  for (const option of Object.keys(updatedOptions)) {
    if (updatedOptions[option] !== restoredOptions[option]) {
      changedOptions[option] = {
        old: restoredOptions[option],
        new: updatedOptions[option],
      }
    }
  }
  await browser.runtime.sendMessage({
    command: "event",
    event: "modify-options",
    eventData: changedOptions,
  })

  if (updatedOptions.disableInteractionTracking) {
    await browser.runtime.sendMessage({
      command: "event",
      event: "disable-tracking",
    })
  }

  await browser.storage.local.set({
    options: updatedOptions,
  })
}

function checkURL(e) {
  const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi
  const inputURL = e.target.value
  if (inputURL !== "" && !inputURL.match(validURLRegex)) {
    document.getElementById("invalid-url").style.display = "block"
  } else {
    document.getElementById("invalid-url").style.display = "none"
  }
}

async function clearCourseData(e) {
  await browser.runtime.sendMessage({
    command: "clear-course-data",
  })

  e.target.disabled = true
}

document.addEventListener("DOMContentLoaded", restore)
document.addEventListener("input", save)
document.getElementById("defaultMoodleURL").addEventListener("input", checkURL)
document.getElementById("clear-button").addEventListener("click", clearCourseData)
