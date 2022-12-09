document.querySelector("#info")?.addEventListener("click", () => {
  chrome.tabs.create({
    url: "/pages/information/information.html",
  })
})

const versionSpan = document.querySelector<HTMLSpanElement>("#version")
if (versionSpan) {
  versionSpan.textContent = `(v. ${chrome.runtime.getManifest().version})`
}

export {}
