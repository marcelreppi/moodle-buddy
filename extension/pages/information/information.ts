import { EventMessage } from "moodle-buddy-types"

document.querySelector("#imprint-link")?.addEventListener("click", () => {
  browser.runtime.sendMessage<EventMessage>({
    command: "event",
    event: "imprint-click",
    saveURL: false,
  })
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelector("#privacy-link")?.addEventListener("click", () => {
  browser.runtime.sendMessage<EventMessage>({
    command: "event",
    event: "privacy-click",
    saveURL: false,
  })
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelectorAll(".options-link")?.forEach(n => {
  n.addEventListener("click", () => {
    browser.runtime.sendMessage<EventMessage>({
      command: "event",
      event: "options-click",
      saveURL: false,
    })
    browser.runtime.openOptionsPage()
  })
})

document.querySelector("#donate-link")?.addEventListener("click", () => {
  browser.runtime.sendMessage<EventMessage>({
    command: "event",
    event: "donate-click",
    saveURL: false,
  })
})

document.querySelectorAll(".contact-link")?.forEach(n => {
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
