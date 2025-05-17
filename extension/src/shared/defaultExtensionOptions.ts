import { ExtensionOptions } from "@types"

const defaultExtensionOptions: ExtensionOptions = {
  onlyNewResources: false,
  useMoodleFileName: true,
  showDownloadOptions: false,
  prependCourseShortcutToFileName: false,
  prependCourseNameToFileName: false,
  prependSectionToFileName: false,
  prependSectionIndexToFileName: false,
  prependFileIndexToFileName: false,
  prependLastModifiedToFileName: false,
  alwaysShowDetails: false,
  disableInteractionTracking: false,
  defaultMoodleURL: "",
  autoSetMoodleURL: true,
  backgroundScanInterval: 30,
  enableBackgroundScanning: true,
  downloadFolderAsZip: true,
  saveToMoodleFolder: false,
  folderStructure: "CourseFile",
  includeVideo: true,
  includeAudio: true,
  includeImage: false,
  maxConcurrentDownloads: 100,
  maxCoursesOnDashboardPage: 100,
  detectFileUpdates: false,
  customSelectorCourseName: "",
  customSelectorCourseShortcut: "",
  customSelectorSectionElement: "",
  customSelectorSectionName: "",
}

export default defaultExtensionOptions
