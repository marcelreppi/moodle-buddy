import Vue from "vue"

import App from "./App.vue"

import "./index.css"

Vue.config.devtools = false
Vue.config.productionTip = false

new Vue({
  el: "#app",
  render: createApp => createApp(App),
})
