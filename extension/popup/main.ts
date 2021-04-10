import { createApp, Plugin } from "vue"
import VueProgressBar from "@aacassandra/vue3-progressbar"

import App from "./App.vue"

import "./index.css"

const app = createApp(App)

app.use(VueProgressBar as Plugin, {
  color: "#007a2b",
  failedColor: "#000000",
  thickness: "15px",
  position: "relative",
})

app.mount("#app")
