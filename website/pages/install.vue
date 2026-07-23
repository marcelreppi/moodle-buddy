<template>
  <main class="install-page">
    <div class="container">
      <div class="title">
        Moodle Buddy
        <img class="title-icon" src="~/assets/images/mb.png" alt="" />
      </div>

      <div class="content-container">
        <div class="thank-you">Thank you very much for installing Moodle Buddy!</div>
        <div class="section-title">How to use</div>
        <div class="section-content">
          <ol>
            <li>Log into your university's Moodle system</li>
            <li>
              <div>Visit any of the following Moodle webpages:</div>
              <ul>
                <li>Moodle Dashboard/Course Overview (URL ending on /my)</li>
                <li>Any Moodle course page (URL includes /course)</li>
                <li>Course activity pages (e.g. URL includes /mod/assign)</li>
                <li>Moodle video page (URL includes /videoservice)</li>
              </ul>
            </li>
            <li>
              Click on the Moodle Buddy logo
              <img class="title-icon" src="~/assets/images/mb.png" alt="" />
              in the extension bar
            </li>
            <li>Explore all the features Moodle Buddy has to offer</li>
          </ol>
        </div>

        <div class="section-content">
          <div class="screenshot-container">
            <div>
              <div class="center">Course Page UI</div>
              <img
                class="screenshot-image"
                src="~/assets/images/coursepage.png"
                alt="Course Page UI"
              />
            </div>
            <div>
              <div class="center">Dashboard UI</div>
              <img
                class="screenshot-image"
                src="~/assets/images/dashboardpage.png"
                alt="Dashboard UI"
              />
            </div>
          </div>
        </div>

        <div>
          Further information you can find
          <a
            class="link"
            :href="informationHref"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="install-info"
          >
            here
          </a>
        </div>
      </div>

      <div class="footer">
        <div class="footer-row">
          <span>
            Inofficial Plugin made by
            <a class="link" href="https://twitter.com/marcelreppi">marcelreppi</a>
          </span>
          <span class="footer-right-section">
            <span id="version">{{ formattedVersion }}</span>
          </span>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { useRoute } from "nuxt/app"

type UmamiTracker = {
  track: (eventName: string, eventData?: Record<string, string>) => void
}

type WindowWithUmami = Window & {
  umami?: UmamiTracker
}

const INSTALL_REF_QUERY_PARAM = "ref"
const DEFAULT_INSTALL_REF = "moodle-buddy-extension"
const BROWSER_ID_QUERY_PARAM = "browserId"
const VERSION_QUERY_PARAM = "version"
const INFORMATION_URL_QUERY_PARAM = "informationUrl"
const INSTALL_EVENT_NAME = "extension-install"

const route = useRoute()

const installRef = ref(DEFAULT_INSTALL_REF)
const browserId = ref("unknown")
const version = ref("")
const informationUrl = ref("")

const formattedVersion = computed(() => (version.value ? `(v. ${version.value})` : ""))
const informationHref = computed(() => informationUrl.value || "/#about")

function getSingleQueryValue(queryParam: string): string {
  const value = route.query[queryParam]

  if (Array.isArray(value)) {
    return value.find((queryValue): queryValue is string => typeof queryValue === "string") ?? ""
  }

  return typeof value === "string" ? value : ""
}

function getTrustedExtensionUrl(value: string): string {
  if (value.startsWith("chrome-extension://") || value.startsWith("moz-extension://")) {
    return value
  }

  return ""
}

function getUmami(): UmamiTracker | undefined {
  return (window as WindowWithUmami).umami
}

function trackInstallEvent(remainingRetries = 10) {
  const umami = getUmami()

  if (umami) {
    umami.track(INSTALL_EVENT_NAME, {
      ref: installRef.value,
      browserId: browserId.value,
      version: version.value,
    })
    return
  }

  if (remainingRetries === 0) {
    return
  }

  window.setTimeout(() => trackInstallEvent(remainingRetries - 1), 300)
}

onMounted(() => {
  installRef.value = getSingleQueryValue(INSTALL_REF_QUERY_PARAM) || DEFAULT_INSTALL_REF
  browserId.value = getSingleQueryValue(BROWSER_ID_QUERY_PARAM) || "unknown"
  version.value = getSingleQueryValue(VERSION_QUERY_PARAM)
  informationUrl.value = getTrustedExtensionUrl(getSingleQueryValue(INFORMATION_URL_QUERY_PARAM))

  trackInstallEvent()
})
</script>

<style scoped>
.install-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  font-weight: 350;
  font-size: 16px;
  line-height: normal;
  display: flex;
  justify-content: center;
}

.install-page img {
  display: inline-block;
  max-width: none;
}

.install-page ol {
  list-style-type: decimal;
  margin: 1em 0;
  padding-left: 40px;
}

.install-page ul {
  list-style-type: disc;
  margin: 1em 0;
  padding-left: 40px;
}

.install-page li {
  display: list-item;
}

.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 5px 20px;
  width: 600px;
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
  margin: 0 5px;
}

.thank-you {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30px;
  margin-top: 30px;
}

.content-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
}

.section-content {
  margin-bottom: 15px;
}

.screenshot-container {
  display: flex;
  flex-direction: row;
  margin-top: 20px;
  font-weight: bold;
}

.screenshot-container > div > div {
  margin-bottom: 10px;
}

.screenshot-image {
  width: 300px;
  height: 310px;
}

.footer {
  display: flex;
  flex-direction: column;
  margin-top: 30px;
  font-size: 14px;
  width: 100%;
  color: #8f8f8f;
}

.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: #8f8f8f;
  margin-bottom: 10px;
}

#version {
  margin-right: 5px;
}

.footer-right-section {
  display: flex;
  align-items: center;
}

.center {
  text-align: center;
}

.install-page a,
.install-page a:hover,
.install-page a:focus,
.install-page a:active {
  text-decoration: none;
  color: inherit;
}

.install-page a.link,
.install-page a.link:focus,
.install-page a.link:active {
  color: #2563eb;
}

.install-page a.link:hover {
  cursor: pointer;
  color: #1948ae;
}
</style>
