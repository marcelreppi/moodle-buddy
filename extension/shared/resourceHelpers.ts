import { Resource } from "../types"

export function isFile(resource: Resource) {
  return ["file", "pluginfile", "url"].includes(resource.type)
}

export function isVideoService(resource: Resource) {
  return resource.type === "videoservice"
}

export function isFolder(resource: Resource) {
  return resource.type === "folder"
}

export function isActivity(resource: Resource) {
  return resource.type === "activity"
}
