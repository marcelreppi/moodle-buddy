<template>
  <div class="px-8 text-center content-container">
    <p>Oops... something went wrong!</p>
    <p>I am very sorry about that! 😥</p>
    <p class="mt-2">
      Please be so kind and submit
      <span class="link" @click="openContactPage">this form</span>
      and tell me what happend.
    </p>
    <p>Thanks! 😊</p>
  </div>
</template>

<script setup lang="ts">
import useNavigation from "../composables/useNavigation"

const { openContactPage } = useNavigation()
</script>

<style></style>
