document.querySelector("#imprint-link").addEventListener("click", e => {
  browser.runtime.sendMessage({
    command: "event",
    event: "imprint-click",
  })
  browser.tabs.create({
    url: "/pages/legal/legal.html",
  })
})

document.querySelector("#options-link").addEventListener("click", e => {
  browser.runtime.sendMessage({
    command: "event",
    event: "options-click",
  })
  browser.runtime.openOptionsPage()
})

document.querySelector("#donate-link").addEventListener("click", e => {
  browser.runtime.sendMessage({
    command: "event",
    event: "donate-click",
  })
})

document.querySelector("#version").textContent = `(v. ${browser.runtime.getManifest().version})`
