import { EventMessage } from "types"

document.querySelector("#imprint-link")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({
    command: "event",
    event: "imprint-click",
    saveURL: false,
  } satisfies EventMessage)
  chrome.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelector("#privacy-link")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({
    command: "event",
    event: "privacy-click",
    saveURL: false,
  } satisfies EventMessage)
  chrome.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelectorAll(".options-link")?.forEach((n) => {
  n.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      command: "event",
      event: "options-click",
      saveURL: false,
    } satisfies EventMessage)
    chrome.runtime.openOptionsPage()
  })
})

document.querySelector("#donate-link")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({
    command: "event",
    event: "donate-click",
    saveURL: false,
  } satisfies EventMessage)
})

document.querySelectorAll(".contact-link")?.forEach((n) => {
  n.addEventListener("click", () => {
    chrome.tabs.create({
      url: "/pages/contact/contact.html",
    })
  })
})

const versionSpan = document.querySelector<HTMLSpanElement>("#version")
if (versionSpan) {
  versionSpan.textContent = `(v. ${chrome.runtime.getManifest().version})`
}

export {}
