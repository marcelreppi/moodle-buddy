const { writeEventToS3, sendBotMessage } = require("./tracker")

exports.handler = async function(event, context) {
  if (event.dev) {
    await writeEventToS3(event)
    await sendBotMessage(event)
  } else {
    await writeEventToS3(event)
  }

  return {
    statusCode: 200,
    event,
  }
}
