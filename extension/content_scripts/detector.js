import { startingPageRegex, coursePageRegex } from "../shared/helpers"

const urlIsSupported =
  Boolean(location.href.match(startingPageRegex)) || Boolean(location.href.match(coursePageRegex))

if (urlIsSupported) {
  browser.runtime.sendMessage({
    command: "set-icon",
    iconType: "normal",
  })
}
