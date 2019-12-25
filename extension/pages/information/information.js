document.querySelector("#imprint-link").addEventListener("click", e => {
  const isFirefox = typeof InstallTrigger !== "undefined"
  browser.tabs.create({
    url: isFirefox ? "../legal/legal.html" : "pages/legal/legal.html",
  })
})

document.querySelector("#options-link").addEventListener("click", e => {
  browser.runtime.openOptionsPage()
})
