<template>
  <footer class="flex items-center justify-between text-xs mt-3">
    <span>
      <div class="link link-info" @click="openContactPage">Report a bug</div>
    </span>
    <span>
      <div class="link link-info" @click="onRateClick">Rate</div>
    </span>
    <span>
      <div class="link link-info" @click="openDonatePage">Donate</div>
    </span>
    <span>
      <div class="link link-info" @click="openOptionsPage">Options</div>
    </span>

    <InformationCircleIcon
      class="size-4 hover:cursor-pointer"
      @click="openInfoPage"
    ></InformationCircleIcon>
  </footer>
</template>

<script setup lang="ts">
import InformationCircleIcon from "@heroicons/vue/16/solid/InformationCircleIcon"
import useRating from "../composables/useRating"
import useNavigation from "../composables/useNavigation"

const { openContactPage, openDonatePage, openInfoPage, openOptionsPage } = useNavigation()
const { onRateClick } = useRating()
</script>
