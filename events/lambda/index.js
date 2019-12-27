const { writeEventToS3 } = require("./tracker")

exports.handler = async function(event, context) {
  await writeEventToS3(event)
  return {
    statusCode: 200,
    event,
  }
}
