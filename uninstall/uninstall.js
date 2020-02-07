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

const search = location.search.substring(1)

if (search !== "") {
  const queryObject = JSON.parse(
    `{"${decodeURI(search)
      .replace(/"/g, '\\"')
      .replace(/&/g, '","')
      .replace(/=/g, '":"')}"}`
  )

  sendToLambda("/event", {
    event: "uninstall",
    browser: isFirefox() ? "firefox" : "chrome",
    browserId: queryObject.browserId ? queryObject.browserId : "unknown",
    dev: false,
  })
} else {
  sendToLambda("/event", {
    event: "uninstall",
    browser: isFirefox() ? "firefox" : "chrome",
    browserId: "unknown",
    dev: false,
  })
}

async function sendFeedback(subject, content) {
  sendToLambda("/feedback", { subject, content })
}

document.querySelector("#form-button").addEventListener("click", e => {
  const content = document.querySelector("#form-content").value

  if (content !== "") {
    sendFeedback("Uninstall", content)

    document.querySelector(".form-container").style.display = "none"
    document.querySelector(".success").style.display = "flex"
  }
})
