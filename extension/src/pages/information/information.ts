import browser from "webextension-polyfill"
import { EventMessage } from "types"

document.querySelector("#imprint-link")?.addEventListener("click", () => {
  browser.runtime.sendMessage({
    command: "event",
    event: "imprint-click",
    saveURL: false,
  } as EventMessage)
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelector("#privacy-link")?.addEventListener("click", () => {
  browser.runtime.sendMessage({
    command: "event",
    event: "privacy-click",
    saveURL: false,
  } as EventMessage)
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelectorAll(".options-link")?.forEach((n) => {
  n.addEventListener("click", () => {
    browser.runtime.sendMessage({
      command: "event",
      event: "options-click",
      saveURL: false,
    } as EventMessage)
    browser.runtime.openOptionsPage()
  })
})

document.querySelector("#donate-link")?.addEventListener("click", () => {
  browser.runtime.sendMessage({
    command: "event",
    event: "donate-click",
    saveURL: false,
  } as EventMessage)
})

document.querySelectorAll(".contact-link")?.forEach((n) => {
  n.addEventListener("click", () => {
    browser.tabs.create({
      url: "/pages/contact/contact.html",
    })
  })
})

const versionSpan = document.querySelector<HTMLSpanElement>("#version")
if (versionSpan) {
  versionSpan.textContent = `(v. ${browser.runtime.getManifest().version})`
}

export {}
