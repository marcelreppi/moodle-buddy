import Vue from "vue"
import VueProgressBar from "vue-progressbar"

import App from "./App.vue"

import "./index.css"

Vue.config.devtools = false
Vue.config.productionTip = false

Vue.use(VueProgressBar, {
  color: "#007a2b",
  failedColor: "#000000",
  thickness: "15px",
  position: "relative",
})

new Vue({
  el: "#app",
  render: createApp => createApp(App),
})
