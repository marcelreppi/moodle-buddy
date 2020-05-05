const videoResources = []

setTimeout(() => {
  const videoServiceURLs = document.querySelectorAll("a[href*='videoservice']")
  const videoNodes = Array.from(videoServiceURLs)
    .filter(n => n.href.endsWith("view"))
    .reduce((nodes, current) => {
      const links = nodes.map(n => n.href)
      if (!links.includes(current.href)) {
        if (current.textContent !== "") {
          nodes.push(current)
        }
      }
      return nodes
    }, [])
    .forEach(n => {
      const videoResource = {
        href: n.href,
        fileName: n.textContent.trim(),
        isVideoServiceVideo: true,
      }
      videoResources.push(videoResource)
    })

  browser.runtime.sendMessage({
    command: "download",
    resources: videoResources,
    courseName: "course.name",
    courseShortcut: "course.shortcut",
    options: {},
  })

  console.log(videoResources)
}, 2000)
