import Vue from "vue"
import App from "./App.vue"

Vue.config.devtools = false

new Vue({
  el: "#app",
  render: createApp => createApp(App),
})
