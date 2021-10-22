import { ExecuteScriptMessage } from "../types"

browser.runtime.sendMessage<ExecuteScriptMessage>({
  command: "execute-script",
  scriptName: "detector",
})
