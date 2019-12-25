# Moodle Buddy

Your university uses Moodle as their learning management platform? </br>
You frequently use that system to access course material?  </br>
You are tired of downloading every file one at a time?

This browser plugin will save you a lot of time! It will scan your moodle course for all available resources (PDF documents, etc.) and allow you to download them all at once. 

Furthermore, Moodle Buddy scans your courses for any updates and shows them to you. You can immediately download new resources from your Moodle Dashboard via the plugin.

---

## Installation

### How to install the plugin for **Firefox**

1. Download the plugin [here](https://raw.githubusercontent.com/marcelreppi/moodle-buddy/master/dist/moodle-buddy-1.0-fx.xpi) or check the [dist](https://github.com/marcelreppi/moodle-buddy/tree/master/dist) directory for the newest version
2. Execute the file with Firefox

Alternatively...

1. Type "about:addons" into the URL bar
2. Click on the dropdown menu with the settings icon
3. Click "Install Add-on From File..." and select the .xpi file

### How to install the plugin for **Chrome**

1. Click [ADD NEW LINK HERE] to visit the plugin's chrome webstore page
2. Click "Add to Chrome" and then "Add extension"

---

## Usage

1. Log into your university's Moodle system
2. Visit any of the following Moodle webpages:
    * Moodle Dashboard/Course Overview
    * Any Moodle course page
3. Click the Moodle Buddy icon in the extension bar of your browser
4. Explore all the features Moodle Buddy has to offer

---

## Questions?

Submit an issue in this repository or reach me on [Twitter](https://twitter.com/marcelreppi)

---

## Screenshots

UI when you open the plugin on the Moodle Dashboard

![StartPreview](https://raw.githubusercontent.com/marcelreppi/moodle-buddy/master/screenshots/startpage.png "Plugin Preview")

UI when you open the plugin on any Moodle course page

![Preview](https://raw.githubusercontent.com/marcelreppi/moodle-buddy/master/screenshots/coursepage.png "Plugin Preview")

# For Developers

## Build

1. Install dependencies

```
npm i
```

2. Build project

```
npm run build
```

3. Now the `build` directory will contain all files for the addon