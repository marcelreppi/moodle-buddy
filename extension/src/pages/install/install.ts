document.querySelector("#info")?.addEventListener("click", () => {
  browser.tabs.create({
    url: "/pages/information/information.html",
  })
})

const versionSpan = document.querySelector<HTMLSpanElement>("#version")
if (versionSpan) {
  versionSpan.textContent = `(v. ${browser.runtime.getManifest().version})`
}

export {}
