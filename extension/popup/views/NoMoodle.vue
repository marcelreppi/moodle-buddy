<template>
  <div class="content-container">
    <div>This is an unsupported webpage.</div>
    <p>Make sure you are...</p>
    <ul>
      <li>on your university's Moodle page</li>
      <li>logged in</li>
      <li>on a supported Moodle webpage</li>
    </ul>
    <p>
      See
      <span class="link" @click="openInfoPage">here</span>
      which Moodle pages are supported.
    </p>
  </div>
</template>

<script>
export default {
  props: {
    openInfoPage: Function,
  },
}
</script>

<style scoped>
ul {
  margin: 0;
}

p {
  margin: 17px 0px;
  /* padding: 0px 60px; */
  text-align: center;
}

p:last-of-type {
  margin-bottom: 0px;
}
</style>
