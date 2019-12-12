document.querySelectorAll(".legal-link").forEach(node => {
  node.addEventListener("click", e => {
    const isFirefox = typeof InstallTrigger !== "undefined"
    browser.tabs.create({
      url: isFirefox ? "../legal/legal.html" : "pages/legal/legal.html",
    })
  })
})
