document.querySelector("#imprint-link").addEventListener("click", () => {
  browser.runtime.sendMessage({
    command: "event",
    event: "imprint-click",
  })
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelector("#privacy-link").addEventListener("click", () => {
  browser.runtime.sendMessage({
    command: "event",
    event: "privacy-click",
  })
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelectorAll(".options-link").forEach(n => {
  n.addEventListener("click", () => {
    browser.runtime.sendMessage({
      command: "event",
      event: "options-click",
    })
    browser.runtime.openOptionsPage()
  })
})

document.querySelector("#donate-link").addEventListener("click", () => {
  browser.runtime.sendMessage({
    command: "event",
    event: "donate-click",
  })
})

document.querySelectorAll(".contact-link").forEach(n => {
  n.addEventListener("click", () => {
    browser.tabs.create({
      url: "/pages/contact/contact.html",
    })
  })
})

document.querySelector("#version").textContent = `(v. ${browser.runtime.getManifest().version})`
