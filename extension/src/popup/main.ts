import { createApp, Plugin } from "vue"
import VueTippy, { setDefaultProps } from "vue-tippy"

import App from "./App.vue"

import "./index.css"
import "tippy.js/dist/tippy.css"

const app = createApp(App)

app.use(VueTippy)
setDefaultProps({
  delay: 500,
})

app.mount("#app")
