function isFirefox() {
  return typeof InstallTrigger !== "undefined"
}

async function sendToLambda(path, body) {
  fetch(`https://v9366xhaf6.execute-api.eu-central-1.amazonaws.com/prod${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "00ssG7y9lC6r5mP653Ate9jgFFSkK1y4zpFPcbUd",
    },
    body: JSON.stringify(body),
  })
    .then(res => console.info(res))
    .catch(error => console.log(error))
}

let browserId = "unknown"

const search = location.search.substring(1)
if (search !== "") {
  const queryObject = JSON.parse(
    `{"${decodeURI(search)
      .replace(/"/g, '\\"')
      .replace(/&/g, '","')
      .replace(/=/g, '":"')}"}`
  )

  if (queryObject.browserId) {
    browserId = queryObject.browserId
  }
}

function sendEvent(event) {
  sendToLambda("/event", {
    event,
    browser: isFirefox() ? "firefox" : "chrome",
    browserId,
    dev: false,
  })
}

sendEvent("uninstall")

document.querySelector("#form-button").addEventListener("click", () => {
  const content = document.querySelector("#form-content").value

  if (content !== "") {
    sendToLambda("/feedback", { subject: "Uninstall", content })
    sendEvent("feedback")

    document.querySelector(".form-container").style.display = "none"
    document.querySelector(".success").style.display = "flex"
  }
})
