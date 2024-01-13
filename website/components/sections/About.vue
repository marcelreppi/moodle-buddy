<template>
  <section>
    <a id="about" class="anchor"></a>
    <h2>About</h2>
    <div>
      <b>Moodle Buddy</b>
      offers mass file download and notification functionality for the Moodle learning management
      platform. Students can download all learning materials with just one click and see updates to
      their courses immediately.
      <br />
      The project is open-source and available
      <a
        data-umami-event="github"
        href="https://github.com/marcelreppi/moodle-buddy"
        target="_blank"
        rel="noopener noreferrer"
      >
        here.
      </a>
    </div>
    <h2>Full Feature List</h2>
    <div class="feature-list">
      <div>
        <strong>Course Page</strong>
        (URL includes /course)
        <ul>
          <li>Download all course resources with one click</li>
          <li>Scans single Moodle courses for new resources</li>
          <li>Scans single Moodle courses for new activities (Assignment Uploads, Forums, etc.)</li>
          <li>Shows you when new resources or activities have been detected</li>
          <li>Download only new resources from a course</li>
          <li>Filter downloadable resources for files and folders</li>
          <li>Modify file names of the downloaded resources</li>
        </ul>
      </div>

      <div>
        <strong>Dashboard</strong>
        (URL ending on /my)
        <ul>
          <li>
            Shows updates (resources &amp; activities) for all courses from the dashboard page
          </li>
          <li>Download new resources directly from the dashboard page</li>
          <li>
            Scans your courses in the background (if you are logged in) and notifies you if there
            are updates
          </li>
        </ul>
      </div>

      <div>
        <strong>Video Page</strong>
        (URL includes /videoservice)
        <ul>
          <li>Download all videos with one click</li>
        </ul>
      </div>
    </div>

    <h2>Usage</h2>
    <ol>
      <li>Log into your university’s Moodle system</li>
      <li>
        Visit any of the following Moodle webpages:
        <ul>
          <li>Moodle Dashboard/Course Overview (URL ending on /my)</li>
          <li>Any Moodle course page (URL includes /course)</li>
          <li>Moodle video page (URL includes /videoservice)</li>
        </ul>
      </li>
      <li>Click the Moodle Buddy icon in the extension bar of your browser</li>
      <li>Explore all the features Moodle Buddy has to offer</li>
    </ol>
  </section>
</template>

<style scoped>
h2 {
  @apply mt-5 mb-2;
}

p {
  @apply my-5;
}

ul {
  @apply list-disc list-inside ml-5;
}

ol {
  @apply list-decimal list-inside ml-5;
}

.feature-list {
  @apply space-y-5;
}
</style>
