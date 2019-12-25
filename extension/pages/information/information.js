document.querySelector("#imprint-link").addEventListener("click", e => {
  browser.tabs.create({
    url: "pages/legal/legal.html",
  })
})

document.querySelector("#options-link").addEventListener("click", e => {
  browser.runtime.openOptionsPage()
})
