document.querySelector("#version").textContent = `(v. ${browser.runtime.getManifest().version})`

document.querySelector("#info").addEventListener("click", () => {
  browser.tabs.create({
    url: "/pages/information/information.html",
  })
})
