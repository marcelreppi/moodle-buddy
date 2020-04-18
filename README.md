# Moodle Buddy

Moodle Buddy is a browser plugin that offers additional helpful functionality to the moodle learning management platform. Students can download all learning materials with just one click and see updates to their courses immediately.

## Installation

The plugin is available for both **Firefox** and **Chrome**.

### Click [here](https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/) for **Firefox**

### Click [here](https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo) for **Chrome**

## Usage

1. Log into your university's Moodle system
2. Visit any of the following Moodle webpages:
    * Moodle Dashboard/Course Overview (URL ending on /my)
    * Any Moodle course page
3. Click the Moodle Buddy icon in the extension bar of your browser
4. Explore all the features Moodle Buddy has to offer

## Full Feature List

![Screenshots](screenshots/combined.png "Course page (simple) | Course page (detailed) | Dashboard page")

**Course Page**
* Download all course resources with one click
* Scans single Moodle courses for new resources
* Scans single Moodle courses for new activities (Assignment Uploads, Forums, etc.)
* Shows you when new resources or activities have been detected
* Download only new resources from a course
* Filter downloadable resources for files and folders
* Modify file names of the downloaded resources

**Dashboard**
* Shows updates (resources & activities) for all courses from the dashboard page
* Download new resources directly from the dashboard page
* Scans your courses in the background (if you are logged in) and notifies you if there are updates

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