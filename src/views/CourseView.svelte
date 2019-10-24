<script>
  import { getActiveTab, sendEvent } from "../helpers.js"

  let activeTab = null
  let loading = true
  let numberOfResources = 0
  let nDocuments = 0
  let nFolders = 0
  let documentsCb = null
  let foldersCb = null
  let downloadButton = null

  let useMoodleFilenameCb = null
  let prependCourseToFilenameCb = null
  let prependCourseShortcutToFilenameCb = null

  function scanForDocuments() {
    browser.tabs.sendMessage(activeTab.id, {
      command: "scan",
    })
    // .catch(showErrorContent)
  }

  function onDownload() {
    sendEvent("download")
    downloadButton.disabled = true
    browser.tabs.sendMessage(activeTab.id, {
      command: "crawl",
      useMoodleFilename: useMoodleFilenameCb.checked,
      prependCourseToFilename: prependCourseToFilenameCb.checked,
      prependCourseShortcutToFilename: prependCourseShortcutToFilenameCb.checked,
      skipDocuments: !documentsCb.checked,
      skipFolders: !foldersCb.checked,
    })
  }

  function onDocumentCbClick(e) {
    if (!e.target.checked && !foldersCb.checked) {
      downloadButton.disabled = true
    } else {
      downloadButton.disabled = false
    }
  }

  function onFolderCbClick() {
    if (!e.target.checked && !documentsCb.checked) {
      downloadButton.disabled = true
    } else {
      downloadButton.disabled = false
    }
  }

  browser.runtime.onMessage.addListener(message => {
    if (message.command === "scan-result") {
      numberOfResources = message.numberOfResources
      nDocuments = message.nDocuments
      nFolders = message.nFolders

      if (message.numberOfResources === 0) {
        downloadButton.disabled = true
      }

      if (message.nDocuments === 0) {
        documentsCb.disabled = true
        documentsCb.checked = false
      }

      if (message.nFolders === 0) {
        foldersCb.disabled = true
        foldersCb.checked = false
      }

      loading = false
    }
  })

  getActiveTab().then(tab => {
    activeTab = tab
    scanForDocuments()
  })
</script>

<style>
  .download-button {
    width: 100px;
    padding: 10px 0px;
    margin-top: 10px;
    border-radius: 5px;
    border: 0;
    background-color: #c50e20;
    color: white;
    font-weight: bold;
    text-align: center;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  }

  .download-button:hover {
    cursor: pointer;
    text-decoration: underline;
  }

  .download-button:disabled {
    background-color: #a8a8a8;
    cursor: default;
    text-decoration: none;
  }

  .resource-info {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .resource-info-number {
    font-weight: 600;
  }

  .resource-selection {
    margin-top: 10px;
  }

  .download-info {
    width: 300px;
    text-align: center;
    margin-bottom: 20px;
  }

  .checkbox-label {
    margin-left: 5px;
  }
</style>

<div class="resource-info">
  <div>
    There
    {#if numberOfResources === 1}is{:else}are{/if}
    <span class="resource-info-number">{numberOfResources}</span>
    {#if numberOfResources === 1}resource{:else}resources{/if}
    available for download.
  </div>
  <div class="resource-selection">
    <div>
      <label id="documents-cb-label">
        <input type="checkbox" bind:this={documentsCb} on:input={onDocumentCbClick} checked />
        <span class="checkbox-label">{nDocuments} document(s) (PDF, etc.)</span>
      </label>
    </div>
    <div>
      <label id="folders-cb-label">
        <input type="checkbox" bind:this={foldersCb} on:input={onFolderCbClick} checked />
        <span class="checkbox-label">{nFolders} folder(s)</span>
      </label>
    </div>
  </div>
</div>

<div class="download-info">
  Click the button below to download all available resources from this Moodle course.
</div>

<div>
  <div>
    <label>
      <input type="checkbox" bind:this={useMoodleFilenameCb} />
      <span class="checkbox-label">Use Moodle file name as actual file name</span>
    </label>
  </div>
  <div>
    <label>
      <input type="checkbox" bind:this={prependCourseShortcutToFilenameCb} />
      <span class="checkbox-label">Prepend course shortcut to each file name</span>
    </label>
  </div>
  <div>
    <label>
      <input type="checkbox" bind:this={prependCourseToFilenameCb} />
      <span class="checkbox-label">Prepend course name to each file name</span>
    </label>
  </div>
</div>
<button class="download-button" on:click={onDownload} bind:this={downloadButton}>Download</button>
