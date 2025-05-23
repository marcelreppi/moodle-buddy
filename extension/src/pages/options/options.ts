import { ExtensionOptions, EventMessage, Message, ExtensionStorage } from "types"
import { validURLRegex } from "@shared/regexHelpers"
import { COMMANDS } from "@shared/constants"

let restoredOptions: ExtensionOptions

async function restore() {
  chrome.storage.local.get("options").then(({ options }) => {
    restoredOptions = options as ExtensionOptions
    const inputs = document.querySelectorAll("input")
    inputs.forEach((input) => {
      switch (input.type) {
        case "checkbox":
          input.checked = options[input.id] as boolean
          break
        case "radio":
          input.checked = input.value === options[input.name]
          break
        default:
          input.value = options[input.id] as string
          break
      }
    })

    // Fake event to trigger the checkURL event callback
    document.getElementById("defaultMoodleURL")?.dispatchEvent(new Event("input"))
  })
}

let timeout: ReturnType<typeof setTimeout>

async function save(e: Event) {
  e.preventDefault()

  const updatedOptions = {} as ExtensionOptions
  const inputs = document.querySelectorAll("input")
  inputs.forEach((input) => {
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

  const changedOptions = {} as ExtensionOptions
  for (const option of Object.keys(updatedOptions)) {
    if (updatedOptions[option] !== restoredOptions[option]) {
      changedOptions[option] = {
        old: restoredOptions[option],
        new: updatedOptions[option],
      }
    }
  }

  clearTimeout(timeout)
  timeout = setTimeout(async () => {
    await chrome.runtime.sendMessage({
      command: COMMANDS.EVENT,
      event: "modify-options",
      saveURL: false,
      eventData: changedOptions,
    } satisfies EventMessage)
  }, 500)

  if (updatedOptions.disableInteractionTracking) {
    await chrome.runtime.sendMessage({
      command: COMMANDS.EVENT,
      event: "disable-tracking",
      saveURL: false,
    } satisfies EventMessage)
  }

  await chrome.storage.local.set({
    options: updatedOptions,
  } satisfies Partial<ExtensionStorage>)
}

function checkURL(e: Event) {
  const target = e.target as HTMLInputElement
  const inputURL = target.value
  const invalidURLHint: HTMLDivElement | null =
    document.querySelector<HTMLDivElement>("#invalid-url")
  if (invalidURLHint) {
    if (inputURL !== "" && !inputURL.match(validURLRegex)) {
      invalidURLHint.style.display = "block"
    } else {
      invalidURLHint.style.display = "none"
    }
  }
}

async function clearCourseData(e: Event) {
  await chrome.runtime.sendMessage({
    command: COMMANDS.CLEAR_COURSE_DATA,
  } satisfies Message)

  const target = e.target as HTMLButtonElement
  target.disabled = true
}

document.addEventListener("DOMContentLoaded", restore)
document.addEventListener("input", save)
document.getElementById("defaultMoodleURL")?.addEventListener("input", checkURL)
document.getElementById("clear-button")?.addEventListener("click", clearCourseData)
