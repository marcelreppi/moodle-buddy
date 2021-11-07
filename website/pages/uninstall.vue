<template>
  <main>
    <div class="logo">
      Moodle Buddy
      <img src="~/assets/images/mb.png" />
    </div>

    <div class="content">
      <div class="bye">Sad to see you go... 😢</div>
      <div class="rating">
        If Moodle Buddy was helpful to you I would appreciate
        <br />
        a rating and a review on the {{ isFirefox ? "Firefox Add-on Store" : "Chrome Web Store" }}
        <button class="umami--click--uninstall-rate" @click="openExtensionStore">
          Rate Moodle Buddy
        </button>
      </div>
      <div v-if="!showLoading && !showError && !showSuccess" class="why">
        Please let me know why you uninstalled Moodle Buddy
        <div class="tell-me">
          <div>
            <textarea v-model="formContent" cols="60" rows="10"></textarea>
            <span class="bottom"></span>
            <span class="right"></span>
            <span class="top"></span>
            <span class="left"></span>
          </div>

          <button class="umami--click--uninstall-feedback" @click="submitForm">Submit</button>
        </div>
      </div>

      <div v-if="showLoading">
        <svg viewBox="25 25 50 50">
          <circle cx="50" cy="50" r="20"></circle>
        </svg>
      </div>

      <div v-if="showError" class="hint">An error has occured 😫</div>

      <div v-if="showSuccess" class="hint">
        Success! 🥳
        <br />
        Thank you very much for your feedback!
      </div>
    </div>
  </main>
</template>

<script>
export default {
  data() {
    return {
      isFirefox: typeof InstallTrigger !== "undefined",
      browserId: "unknown",
      showLoading: false,
      showError: false,
      showSuccess: false,
      formContent: "",
    }
  },
  created() {
    if ("browserId" in this.$route.query) {
      this.browserId = this.$route.query.browserId
    }

    this.sendEvent("uninstall")
  },
  methods: {
    sendToLambda(path, body) {
      return fetch(`https://api.moodlebuddy.com${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "00ssG7y9lC6r5mP653Ate9jgFFSkK1y4zpFPcbUd",
        },
        body: JSON.stringify(body),
      })
    },
    sendEvent(event) {
      return this.sendToLambda("/event", {
        event,
        browser: this.isFirefox ? "firefox" : "chrome",
        browserId: this.browserId,
        dev: false,
      })
    },
    openExtensionStore() {
      window.open(
        this.isFirefox
          ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
          : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"
      )
    },
    async submitForm() {
      if (this.formContent !== "") {
        this.showLoading = true
        try {
          await this.sendEvent("feedback")
          await this.sendToLambda("/feedback", { subject: "Uninstall", content: this.formContent })
          this.showSuccess = true
        } catch (error) {
          this.showError = true
          console.error(error)
        } finally {
          this.showLoading = false
        }
      }
    },
  },
}
</script>

<style>
main {
  @apply flex flex-col justify-center items-center py-2 px-5;
}

.logo {
  @apply flex items-center text-xl text-center mb-5 mt-2;
}

.logo > img {
  @apply w-5 ml-3;
}

.content {
  @apply flex flex-col justify-center items-center space-y-8;
}

.bye {
  @apply text-xl font-bold text-center;
}

.why {
  @apply text-lg text-center;
}

.tell-me {
  @apply flex flex-col items-center space-y-3 mt-3;
}

.rating {
  @apply text-lg text-center flex flex-col items-center;
}

.rating button {
  @apply text-lg mt-5 py-3 px-5 rounded bg-mb-red text-white font-bold text-center cursor-pointer shadow hover:underline;
}

.tell-me div {
  position: relative;
}

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
  bottom: 7px;
  transform: scaleY(0);
}

.tell-me .top {
  top: 0;
}

.tell-me .bottom {
  bottom: 7px;
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

.tell-me button {
  @apply py-2 px-4 rounded font-bold bg-mb-red text-white text-center text-lg shadow hover:underline cursor-pointer;
}

.hint {
  @apply text-lg font-bold flex flex-col items-center text-center;
}
</style>
