<template>
  <header>
    <nav>
      <a class="logo umami--click--navbar-icon" href="#download">
        <div>Moodle Buddy</div>
        <img src="~/assets/images/mb.png" alt="" />
      </a>
      <div class="nav-items">
        <a class="umami--click--navbar-download" href="#download">Download</a>
        <a class="umami--click--navbar-about" href="#about">About</a>
        <a class="umami--click--navbar-contact" href="#contact">Contact</a>
      </div>
    </nav>
  </header>
</template>

<style scoped>
header {
  @apply bg-gray-100 h-16 w-full fixed top-0 flex justify-center md:px-10 lg:px-20;
}

nav {
  @apply flex w-full md:max-w-6xl mx-3 md:text-lg;
}

.logo {
  @apply flex items-center space-x-2 mr-5;
}

.logo > div {
  @apply hidden md:block text-xl mr-2;
}

.logo > img {
  @apply w-6;
}

.nav-items {
  @apply flex items-center ml-auto space-x-5 md:space-x-20;
}

.nav-items > a {
  position: relative;
}

.nav-items > a::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #c50e20;
  transform-origin: bottom right;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.nav-items > a:hover::before {
  transform-origin: bottom left;
  transform: scaleX(1);
}
</style>
