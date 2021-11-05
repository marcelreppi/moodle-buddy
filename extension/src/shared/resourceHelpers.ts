import { Resource } from "../types"

export function isFile(resource: Resource) {
  return ["file", "pluginfile", "url"].includes(resource.type)
}

export function isVideoServiceVideo(resource: Resource) {
  return resource.type === "videoservice"
}

export function isFolder(resource: Resource) {
  return resource.type === "folder"
}

export function isActivity(resource: Resource) {
  return resource.type === "activity"
}

export function setResourceSelected(resources: Resource[], href: string, value: boolean) {
  const resource = resources.find((r) => r.href === href)
  if (resource) {
    resource.selected = value
  }
}
