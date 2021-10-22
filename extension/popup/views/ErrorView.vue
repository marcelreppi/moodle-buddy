<template>
  <div class="px-8 text-center content-container">
    <p>Oops... something went wrong!</p>
    <p>I am very sorry about that! 😥</p>
    <p class="mt-2">
      Please be so kind and submit
      <span class="link" @click="onFormClick">this form</span>
      and tell me what happend.
    </p>
    <p>Thanks! 😊</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { navigateTo } from "../../shared/helpers"

export default defineComponent({
  methods: {
    onFormClick() {
      navigateTo("/pages/contact/contact.html")
    },
  },
})
</script>

<style></style>
