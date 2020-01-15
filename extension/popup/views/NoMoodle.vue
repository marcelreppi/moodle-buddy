<template>
  <div class="content-container">
    <div class="marginize">This is an unsupported webpage.</div>
    <div v-if="showDefaultURLInput" class="content-container">
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
    <div v-else class="link" @click="navigateToMoodle">
      Go to my Moodle
    </div>
    <p>Make sure you are...</p>
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
  },
  data() {
    return {
      urlInput: "",
      showInvalidURL: false,
    }
  },
  computed: {
    showDefaultURLInput() {
      return this.options && this.options.defaultMoodleURL === ""
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
      console.log(this.options.defaultMoodleURL)
      browser.tabs.create({
        url: this.options.defaultMoodleURL,
      })
      sendEvent("go-to-moodle")
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

p {
  margin: 17px 0px 5px 0px;
  /* padding: 0px 60px; */
  text-align: center;
}

p:last-of-type {
  margin-bottom: 0px;
}

.marginize {
  margin-bottom: 10px;
}
</style>
