export interface Resource {
  href: string
  name: string
  section: string
  isNew: boolean
  type: "file" | "pluginfile" | "videoservice" | "url" | "folder"
  partOfFolder?: string
  selected?: boolean // Only used on the frontend
  resourceIndex: number
  sectionIndex: number
}

export interface FileResource extends Resource {
  type: "file" | "pluginfile" | "videoservice" | "url"
  isFile: true
}

export interface VideoResource extends FileResource {
  src: string
  type: "videoservice"
}

export interface FolderResource extends Resource {
  type: "folder"
  isFolder: true
  isInline: boolean
}

export interface Activity {
  href: string
  name: string
  type: string
  section: string
  isActivity: true
  isNew: boolean
}

export interface Counts {
  nFiles: number
  nNewFiles: number
  nFolders: number
  nNewFolders: number
  nActivities: number
  nNewActivities: number
}

export interface CourseData extends browser.storage.StorageObject {
  seenResources: string[]
  newResources: string[]
  seenActivities: string[]
  newActivities: string[]
}
