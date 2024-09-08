<p style="display: flex; flex-direction: column; align-items: center;">
   <a href="https://moodlebuddy.com">
      <img src="website/assets/images/mb.png">
   </a>
   <h2 align="center">MoodleBuddy</h2>
   <p style="width: 600px; margin: auto; text-align: center;">
      Moodle Buddy offers mass file download and notification functionality for the Moodle learning management platform. Students can download all learning materials with just one click and see updates to their courses immediately.
   </p>
</p>

## Installation

The plugin is available for both **Chrome** and **Firefox**.

<a href="https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"><img src="https://user-images.githubusercontent.com/585534/107280622-91a8ea80-6a26-11eb-8d07-77c548b28665.png" alt="Get Moodle Buddy for Chromium"></a>

![Version](https://img.shields.io/chrome-web-store/v/nomahjpllnbcpbggnpiehiecfbjmcaeo)
![Users](https://img.shields.io/chrome-web-store/users/nomahjpllnbcpbggnpiehiecfbjmcaeo)
![Ratings](https://img.shields.io/chrome-web-store/rating/nomahjpllnbcpbggnpiehiecfbjmcaeo)

<a href="https://addons.mozilla.org/addon/moodle-buddy/"><img src="https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png" alt="Get Moodle Buddy for Firefox"></a>

![Version](https://img.shields.io/amo/v/moodle-buddy)
![Users](https://img.shields.io/amo/users/moodle-buddy)
![Ratings](https://img.shields.io/amo/rating/moodle-buddy)

## Usage

1. Log into your university's Moodle system
2. Visit any of the following Moodle webpages:
   - Moodle Dashboard/Course Overview (URL ending on /my)
   - Any Moodle course page (URL includes /course)
   - Moodle video page (URL includes /videoservice)
3. Click the Moodle Buddy icon in the extension bar of your browser
4. Explore all the features Moodle Buddy has to offer

## Full Feature List

### Course Page

- Download all course resources with one click
- Scans single Moodle courses for new resources
- Scans single Moodle courses for new activities (Assignment Uploads, Forums, etc.)
- Shows you when new resources or activities have been detected
- Download only new resources from a course
- Filter downloadable resources for files and folders
- Modify file names of the downloaded resources

### Dashboard

- Shows updates (resources & activities) for all courses from the dashboard page
- Download new resources directly from the dashboard page
- Scans your courses in the background (if you are logged in) and notifies you if there are updates

# Licensing

Usage of this codebase is permitted according to the GNU Affero General Public License v3 (AGPL-3.0).

**READ THE [FULL LICENSE](LICENSE) BEFORE USING.**

You MUST:

- Respect the copyright which is held by the maintainers of this project
- Disclose all changes you made to the code and also publish any code directly based on this code
- Give attribution to the original maintainers when using this project (especially when used commercially)

You can not:

- Sublicense this codebase
- Expect any liability, warranty or similar by the original maintainers. However, we want to improve this project as much as possible so feedback is heard!

# For Developers

All commands need to be run in the `extension` directory

## Setup

1. Install dependencies

```bash
npm install
```

## Development

1. Open one terminal and run `npm run dev`
   - This runs webpack and reloads the bundle on every file change.
2. Open a second terminal and run `npm start`
   - This starts **Firefox Nightly** with the plugin installed and reloads the plugin on every file change.
   - Alternatively, run `npm run start:ff` to use regular Firefox
   - If you want to use Chrome for the development you can load an unpacked extension pointing to the `build` directory. Make sure to reload the extension after every file change.

## Debugging

- When using Firefox I suggest opening the _Browser Console_ with the shortcut `CTRL + Shift + J`
- Make sure to click the Cog Icon and enable _Show Content Messages_. This makes the log statements from the code show up in the console.

## Build

1. `npm run build`
