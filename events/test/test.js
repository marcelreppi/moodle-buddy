const { writeEventToS3 } = require("../lambda/tracker")

const testEvent = {
  event: "update",
  browser: "firefox",
  browserId: "asdasdasdasdasdasdasd",
  test: true
}

const test = async () => {
  const res = await writeEventToS3(testEvent, true)
  console.log(res)
}

test()
