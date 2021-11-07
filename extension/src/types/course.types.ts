export type ResourceTypes = FileResourceTypes | "folder" | "activity"
export type FileResourceTypes = "file" | "pluginfile" | "url" | "videoservice"

export interface Resource {
  href: string
  name: string
  section: string
  isNew: boolean
  type: ResourceTypes
  partOfFolder?: string
  selected?: boolean // Only used on the frontend
  resourceIndex: number
  sectionIndex: number
}

export interface FileResource extends Resource {
  type: FileResourceTypes
}

export interface VideoServiceResource extends Resource {
  type: "videoservice"
  src: string
}

export interface FolderResource extends Resource {
  type: "folder"
  isInline: boolean
}

export interface Activity extends Resource {
  type: "activity"
  activityType: string
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