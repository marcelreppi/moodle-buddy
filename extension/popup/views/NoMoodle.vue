<template>
  <div class="content-container">
    <div v-if="nUpdates > 0" class="marginize">
      There {{ nUpdates === 1 ? "is" : "are" }}
      <span class="bold">
        {{ nUpdates }}
        {{ nUpdates === 1 ? "update" : "updates" }}
      </span>
      to your courses
    </div>
    <div v-if="showDefaultURLInput" class="content-container marginize">
      <div>
        Want to navigate to your Moodle from here?
      </div>
      <div>
        Paste the URL below:
      </div>
      <div>
        <input class="url-input" type="text" name="" id="" v-model="urlInput" />
        <button class="save-button" @click="onSaveClick">Save</button>
      </div>
      <transition name="fade">
        <div v-if="showInvalidURL" class="invalid-url">Invalid URL!</div>
      </transition>
    </div>
    <div v-else class="marginize link" @click="navigateToMoodle">
      Go to my Moodle
    </div>
    <hr />
    <div>This is an unsupported webpage.</div>
    <div class="hints">Make sure you are...</div>
    <ul>
      <li>on your university's Moodle page</li>
      <li>logged in</li>
      <li>on a <span class="link" @click="openInfoPage">supported</span> Moodle webpage</li>
    </ul>
  </div>
</template>

<script>
import { sendEvent, validURLRegex } from "../../shared/helpers"

export default {
  props: {
    openInfoPage: Function,
    options: Object,
    nUpdates: Number,
  },
  data() {
    return {
      urlInput: "",
      showInvalidURL: false,
    }
  },
  computed: {
    showDefaultURLInput() {
      if (this.options) {
        return this.options.defaultMoodleURL === ""
      }

      return true
    },
  },
  methods: {
    onSaveClick() {
      if (!this.urlInput.match(validURLRegex)) {
        this.showInvalidURL = true
        setTimeout(() => {
          this.showInvalidURL = false
        }, 2000)
        return
      }
      this.options.defaultMoodleURL = this.urlInput
      browser.storage.local.set({
        options: { ...this.options },
      })
    },
    navigateToMoodle() {
      browser.tabs.create({
        url: this.options.defaultMoodleURL,
      })
      sendEvent("go-to-moodle", false)
      window.close()
    },
  },
}
</script>

<style scoped>
.url-input {
  width: 250px;
  font-family: inherit;
}

.save-button {
  width: 60px;
  padding: 2px 5px 3px 5px;
  margin-left: 7px;
  border-radius: 5px;
  border: 0;
  background-color: #c50e20;
  color: white;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.save-button:hover {
  cursor: pointer;
  text-decoration: underline;
}

.invalid-url {
  padding: 2px 15px 4px 15px;
  margin-top: 15px;
  border-radius: 5px;
  border: 0;
  background-color: #000000;
  color: white;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.fade-leave-active {
  transition: all 0.5s;
}
.fade-enter-active {
  transition: all 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

ul {
  margin: 0;
}

hr {
  width: 85%;
}

.hints {
  margin: 17px 0px 5px 0px;
  /* padding: 0px 60px; */
  text-align: center;
}

.marginize {
  margin-bottom: 10px;
}
</style>
