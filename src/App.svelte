<script>
  import { getActiveTab, sendEvent } from "./helpers.js"
  import CourseView from "./views/CourseView.svelte"
  import StartingPageView from "./views/StartingPageView.svelte"
  import NoMoodle from "./views/NoMoodle.svelte"

  sendEvent("pageview")

  let activeTab = null
  let showStartingPageView = false
  let showCourseView = false
  let showNoMoodle = false

  function checkURL() {
    if (activeTab.url.match(/https:\/\/.*\/my\//gi)) {
      showStartingPageView = true
      return
    }

    if (activeTab.url.match(/https:\/\/.*\/course\/view\.php\?id=/gi)) {
      showCourseView = true
      return
    }

    showNoMoodle = true
  }

  function onInfoIconClick() {
    browser.tabs.create({
      url: "../pages/information/information.html",
    })
    sendEvent("info-click")
  }

  getActiveTab().then(tab => {
    activeTab = tab
    checkURL()
  })
</script>

<style>
  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 5px 20px;
  }

  .title {
    font-size: 24px;
    text-align: center;
    margin-bottom: 20px;
    margin-top: 5px;
  }

  .title-icon {
    width: 20px;
    height: 20px;
    margin: 0px 5px;
  }

  .content-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 30px;
    font-size: 10px;
    width: 100%;
    font-weight: 500;
    color: #8f8f8f;
  }

  .footer-right-section {
    display: flex;
    align-items: center;
  }

  .info-icon {
    width: 16px;
    height: 16px;
    margin-left: 10px;
  }

  .info-icon:hover {
    cursor: pointer;
  }
</style>

<div class="container">
  <div class="title">
    Moodle Buddy
    <img class="title-icon" src="../icons/icon48.png" alt="logo" />
  </div>

  <div id="popup-content" class="content-container">
    {#if showStartingPageView}
      <StartingPageView />
    {/if}

    {#if showCourseView}
      <CourseView />
    {/if}

    {#if showNoMoodle}
      <NoMoodle />
    {/if}
  </div>

  <div class="footer">
    <span>
      Inofficial Plugin made by
      <a href="https://twitter.com/marcelreppi">marcelreppi</a>
    </span>
    <span class="footer-right-section">
      <a href="https://github.com/marcelreppi/moodle-buddy">GitHub</a>
      <img class="info-icon" src="../icons/information.png" alt="info" on:click={onInfoIconClick} />
    </span>
  </div>
</div>
