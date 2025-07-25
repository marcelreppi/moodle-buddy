<template>
  <main class="flex flex-col items-center justify-center px-5 py-2">
    <div class="flex items-center mt-2 mb-5 text-xl text-center">
      Moodle Buddy
      <img src="~/assets/images/mb.png" class="w-5 ml-3" />
    </div>

    <div class="flex flex-col items-center justify-center space-y-8">
      <div class="text-xl font-bold text-center">Sad to see you go... 😢</div>
      <div class="flex flex-col items-center text-lg text-center">
        If Moodle Buddy was helpful to you I would appreciate
        <br />
        a rating and a review on the {{ isFirefox ? "Firefox Add-on Store" : "Chrome Web Store" }}
        <button
          data-umami-event="uninstall-rate"
          class="mt-3"
          @click="openExtensionStore"
        >
          Rate Moodle Buddy
        </button>
      </div>

      <div v-if="showLoading">
        <svg viewBox="25 25 50 50">
          <circle cx="50" cy="50" r="20"></circle>
        </svg>
      </div>
      <div v-else-if="showError" class="hint">An error has occured 😫</div>
      <div v-else-if="showSuccess" class="hint">
        Success! 🥳
        <br />
        Thank you very much for your feedback!
      </div>
      <div v-else class="text-lg text-center">
        Please let me know why you uninstalled Moodle Buddy
        <div class="flex flex-col items-center mt-3 space-y-3 tell-me">
          <div class="relative">
            <textarea v-model="formContent" cols="60" rows="10"></textarea>
            <span class="bottom" :style="{ bottom: isFirefox ? '2px' : '7px' }"></span>
            <span class="right" :style="{ bottom: isFirefox ? '2px' : '7px' }"></span>
            <span class="top"></span>
            <span class="left" :style="{ bottom: isFirefox ? '2px' : '7px' }"></span>
          </div>

          <button
            data-umami-event="uninstall-feedback"
            @click="submitForm"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue"
import { useRoute } from "nuxt/app"
import { isFirefoxBrowser } from "~/utils"

const BROWSER_ID_QUERY_PARAM = "browserId"

const isFirefox = isFirefoxBrowser()

const browserId = ref("unknown")
const showLoading = ref(false)
const showError = ref(false)
const showSuccess = ref(false)
const formContent = ref("")

const route = useRoute()

function sendToLambda(path: string, body: object) {
  return fetch(`https://api.moodlebuddy.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "00ssG7y9lC6r5mP653Ate9jgFFSkK1y4zpFPcbUd",
    },
    body: JSON.stringify(body),
  })
}

function sendEvent(event: string) {
  return sendToLambda("/event", {
    event,
    browser: isFirefox ? "firefox" : "chrome",
    browserId: browserId.value,
    dev: false,
  })
}

function openExtensionStore() {
  window.open(
    isFirefox
      ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
      : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"
  )
}

async function submitForm() {
  if (formContent.value !== "") {
    showLoading.value = true
    try {
      await Promise.all([
        sendEvent("feedback"),
        sendToLambda("/feedback", {
          subject: "Uninstall",
          content: formContent.value,
        }),
      ])
      showSuccess.value = true
    } catch (error) {
      showError.value = true
      console.error(error)
    } finally {
      showLoading.value = false
    }
  }
}

onMounted(() => {
  if (BROWSER_ID_QUERY_PARAM in route.query) {
    browserId.value = route.query[BROWSER_ID_QUERY_PARAM]
  }

  sendEvent("uninstall")
})
</script>

<style scoped>
textarea {
  background-color: hsl(0, 0%, 99%);
  padding: 0.5rem;
  border: 1px solid hsl(0, 0%, 90%);
  transition: background-color 0.3s ease-in-out;
}

textarea:focus {
  outline: none;
}

textarea::placeholder {
  color: hsla(0, 0%, 100%, 0.6);
}

.tell-me span {
  position: absolute;
  background-color: #c50e20;
  transform-origin: center;
  transition: transform 0.5s ease;
}

.tell-me .bottom,
.tell-me .top {
  height: 1px;
  left: 0;
  right: 0;
  transform: scaleX(0);
}

.tell-me .left,
.tell-me .right {
  width: 1px;
  top: 0;
  /* bottom: 1px; */
  transform: scaleY(0);
}

.tell-me .top {
  top: 0;
}

.tell-me .bottom {
  /* bottom: 1px; */
}

.tell-me .left {
  left: 0;
}

.tell-me .right {
  right: 0;
}

textarea:focus ~ .top,
textarea:focus ~ .bottom {
  transform: scaleX(1);
}

textarea:focus ~ .left,
textarea:focus ~ .right {
  transform: scaleY(1);
}

svg {
  width: 3.75em;
  transform-origin: center;
  animation: rotate 2s linear infinite;
}

circle {
  fill: none;
  stroke: #c50e20;
  stroke-width: 2;
  stroke-dasharray: 1, 200;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -35px;
  }
  100% {
    stroke-dashoffset: -125px;
  }
}

button {
  @apply py-2 px-4 rounded font-bold bg-mb-red text-white text-center text-lg shadow hover:underline cursor-pointer;
}

.hint {
  @apply text-lg font-bold flex flex-col items-center text-center;
}
</style>
