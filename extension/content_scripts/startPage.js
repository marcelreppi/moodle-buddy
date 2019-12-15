import browser from "webextension-polyfill"

let courseTitles = null

function scanForCourses() {
  const overviewNode = document.querySelector("div[data-region='myoverview']")
  if (!overviewNode) {
    // Overview is hidden
    // console.log("hidden list")
    courseTitles = []
    return
  }

  const emptyCourseList = overviewNode.querySelector("div[data-region='empty-message']")
  if (emptyCourseList) {
    // There are no courses shown
    // console.log("empty list")
    courseTitles = []
    return
  }

  const courseNodes = overviewNode.querySelectorAll("div[data-region='course-content']")
  if (courseNodes.length === 0) {
    // Check again if courses have not loaded yet
    setTimeout(scanForCourses, 200)
  } else {
    courseTitles = Array.from(courseNodes).map(n => {
      return n.querySelector(".multiline").innerText
    })

    // Check for documents and other elements in the course pages

    // Somehow save the number of documents
    // Array.from(courseNodes).forEach(n => {
    //   localStorage.setItem(`course-${n.children[0].href.split("=")[1]}`, Math.random())
    // })

    // Check if number has changed

    // Show updates

    // console.log(courseTitles)
  }
}

scanForCourses()

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    browser.runtime.sendMessage({
      command: "scan-result",
      courses: courseTitles,
    })
    return
  }
})
