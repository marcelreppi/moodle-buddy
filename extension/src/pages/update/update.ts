import browser from "webextension-polyfill"

document.querySelectorAll(".version").forEach((node) => {
  node.textContent = browser.runtime.getManifest().version
})

document.querySelectorAll(".info-page").forEach((node) => {
  node.addEventListener("click", () => {
    browser.tabs.create({
      url: `/pages/information/information.html${node.id !== "" ? `#${node.id}` : ""}`,
    })
  })
})

document.querySelectorAll(".options-link").forEach((node) => {
  node.addEventListener("click", () => {
    browser.tabs.create({
      url: `/pages/options/options.html${node.id !== "" ? `#${node.id}` : ""}`,
    })
  })
})

document.querySelectorAll(".contact-link").forEach((node) => {
  node.addEventListener("click", () => {
    browser.tabs.create({
      url: `/pages/contact/contact.html${node.id !== "" ? `#${node.id}` : ""}`,
    })
  })
})
