<template>
  <section>
    <a id="download" class="anchor"></a>
    <div class="hero">
      <div>
        <div class="mobile-mb">
          <div>Moodle Buddy</div>
          <img src="~/assets/images/mb.png" alt="" />
        </div>
        <h2>Mass download and notifications for the Moodle learning management platform</h2>
        <p>
          Enhance your Moodle experience with
          <b>Moodle Buddy</b>
          and always keep up-to-date with your course material.
        </p>
        <p>Great for students and teachers!</p>
        <div class="dl">
          <div class="dl-chrome">
            <div class="shields">
              <img
                src="https://img.shields.io/chrome-web-store/v/nomahjpllnbcpbggnpiehiecfbjmcaeo"
                alt="Version"
              />
              <img
                src="https://img.shields.io/chrome-web-store/users/nomahjpllnbcpbggnpiehiecfbjmcaeo"
                alt="Users"
              />
              <img
                src="https://img.shields.io/chrome-web-store/rating/nomahjpllnbcpbggnpiehiecfbjmcaeo"
                alt="Ratings"
              />
            </div>
            <div>
              <a
                class="umami--click--chrome-download"
                target="_blank"
                rel="noopener noreferrer"
                href="https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"
              >
                <img src="~/assets/images/chrome.png" alt="" />
                Download for Chrome
              </a>
            </div>
          </div>
          <div class="dl-firefox">
            <div class="shields">
              <img src="https://img.shields.io/amo/v/moodle-buddy" alt="Version" />
              <img src="https://img.shields.io/amo/users/moodle-buddy" alt="Users" />
              <img src="https://img.shields.io/amo/rating/moodle-buddy" alt="Ratings" />
            </div>
            <a
              class="umami--click--firefox-download"
              target="_blank"
              rel="noopener noreferrer"
              href="https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
            >
              <img src="~/assets/images/firefox.png" alt="" />
              Download for Firefox
            </a>
          </div>
        </div>
      </div>
      <div>
        <div>
          <img class="screenshot" src="~/assets/images/coursepage.png" alt="" />
        </div>
        <div>
          <img class="screenshot" src="~/assets/images/dashboardpage.png" alt="" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  @apply flex flex-col items-center xl:flex-row justify-center space-y-5 py-5 md:py-32;
}

.hero > div:nth-of-type(1) {
  @apply flex flex-col xl:max-w-md;
}

p {
  @apply mb-2;
}

.mobile-mb {
  @apply flex justify-center items-center text-2xl mb-5 md:hidden;
}

.mobile-mb img {
  @apply ml-2 h-6;
}

h2 {
  @apply mb-5;
}

.dl {
  @apply mt-5 flex flex-wrap justify-center xl:flex-col;
}

.dl > div {
  @apply mb-3 md:m-3;
}

.shields {
  @apply flex flex-wrap mb-1;
}

.shields > img {
  @apply mr-1 mb-1;
}

.dl a {
  @apply flex items-center justify-center font-bold text-white p-3 rounded hover:underline xl:w-64;
}

.dl a img {
  @apply w-6 h-6 mr-4;
}

.dl-chrome a {
  background: rgb(75 139 245);
}

.dl-firefox a {
  background: rgb(255 137 2);
}

.hero > div:nth-of-type(2) {
  @apply flex flex-wrap justify-center xl:flex-nowrap;
}

.screenshot {
  @apply max-h-80 shadow border border-gray-200 rounded mt-3 md:mx-3;
}
</style>
