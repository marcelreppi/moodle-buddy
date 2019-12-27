const { sendBotMessage } = require("../lambda/tracker")

const testEvent = {
  event: "testevent",
  browser: "vscode",
  browserId: "testbrowserid",
  dev: true,
}

const test = async () => {
  const res = await sendBotMessage(testEvent)
  console.log(res)
}

test()
