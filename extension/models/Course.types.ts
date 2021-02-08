export interface ResourceCounts {
  nFiles: number
  nNewFiles: number
  nFolders: number
  nNewFolders: number
}

export interface Resource {
  href: string
  name: string
  section: string
  isNew: boolean
  type: "file" | "pluginfile" | "videoservice" | "url" | "folder"
  partOfFolder?: string
}

export interface FileResource extends Resource {
  type: "file" | "pluginfile" | "videoservice" | "url"
  isFile: true
}

export interface FolderResource extends Resource {
  type: "folder"
  isFolder: true
  isInline: boolean
}

export interface ActivitiesCounts {
  nActivities: number
  nNewActivities: number
}

export interface Activity {
  href: string
  name: string
  type: string
  section: string
  isActivity: true
  isNew: boolean
}

export interface CourseData extends browser.storage.StorageObject {
  seenResources: string[]
  newResources: string[]
  seenActivities: string[]
  newActivities: string[]
}
