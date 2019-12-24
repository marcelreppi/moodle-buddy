function onError(error) {
  console.log(`Error: ${error}`)
  const errorNode = document.querySelector(".error")
  errorNode.textContent = error
  errorNode.classList.add("show")
  setTimeout(() => {
    document.querySelector(".error").classList.remove("show")
  }, 10000)
}

function onSuccess() {
  document.querySelector(".success").classList.add("show")
  setTimeout(() => {
    document.querySelector(".success").classList.remove("show")
  }, 3000)
}

function restore() {
  browser.storage.local.get("options").then(({ options = {} }) => {
    const inputs = document.querySelectorAll("input")
    inputs.forEach(input => {
      input.checked = options[input.id] || input.checked
    })
  }, onError)
}

function save(e) {
  e.preventDefault()
  const updatedOptions = {}
  const inputs = document.querySelectorAll("input")
  inputs.forEach(input => {
    updatedOptions[input.id] = input.checked
  })
  browser.storage.local
    .set({
      options: updatedOptions,
    })
    .then(onSuccess, onError)
}

document.addEventListener("DOMContentLoaded", restore)
document.querySelector("form").addEventListener("submit", save)
