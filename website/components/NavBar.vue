<template>
  <header>
    <nav>
      <a class="umami--click--navbar-icon" href="#download">
        <div>Moodle Buddy</div>
        <img src="~/assets/images/mb.png" alt="" />
      </a>
      <div>
        <a class="umami--click--navbar-download" href="#download">Download</a>
        <a class="umami--click--navbar-about" href="#about">About</a>
        <a class="umami--click--navbar-contact" href="#contact">Contact</a>
      </div>
    </nav>
  </header>
</template>

<style scoped>
header {
  @apply bg-gray-100 h-16 w-full fixed top-0 flex justify-center;
}

nav {
  @apply flex w-full md:w-10/12 mx-3 md:text-lg;
}

nav > a {
  @apply flex items-center space-x-2 mr-5;
}

nav > a > div {
  @apply hidden md:block text-xl mr-2;
}

nav > a > img {
  @apply w-6;
}

nav > div {
  @apply flex items-center ml-auto space-x-5 md:space-x-20;
}
</style>
