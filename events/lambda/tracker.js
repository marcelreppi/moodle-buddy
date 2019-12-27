const AWS = require("aws-sdk")

exports.writeEventToS3 = async (event, test = false) => {
  if (event.test) {
    test = true
  }

  const s3 = new AWS.S3()
  const getParams = {
    Bucket: `moodle-buddy-event-bucket${test ? "-test" : ""}`,
    Key: "events.csv",
  }
  const res = await s3.getObject(getParams).promise()
  let eventCsv = res.Body.toString()

  const pad = n => (n < 10 ? `0${n}` : n)
  const now = new Date()
  const date = `${pad(now.getDate())}.${pad(now.getMonth())}.${now.getFullYear()}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const newEvent = `${event.event};${date};${time};${event.browser};${event.browserId}\n`
  eventCsv += newEvent

  const putParams = {
    Bucket: `moodle-buddy-event-bucket${test ? "-test" : ""}`,
    Key: "events.csv",
    Body: Buffer.from(eventCsv),
  }
  await s3.putObject(putParams).promise()
  return eventCsv
}
