import pino from "pino"
import { isDev } from "./helpers"

export default pino({
  level: isDev ? "debug" : "info",
})
