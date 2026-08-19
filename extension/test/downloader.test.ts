import { describe, expect, it, vi } from "vitest"

import { Downloader } from "../src/background-scripts/downloader"
import defaultExtensionOptions from "../src/shared/defaultExtensionOptions"
import type { ExtensionOptions, FileResource } from "../src/types"

const resource: FileResource = {
  href: "https://moodle.example/lecture.pdf",
  name: "lecture.pdf",
  section: "Oscillations",
  isNew: false,
  isUpdated: false,
  type: "pluginfile",
  resourceIndex: 1,
  sectionIndex: 4,
}

const chromeDownloadMock = vi.mocked(chrome.downloads.download)

async function expectDownloadWithOptions(
  options: Partial<ExtensionOptions>,
  expectedFileName: string
) {
  new Downloader(
    "download-id",
    "https://moodle.example/course/view.php?id=1",
    "Physics",
    "PHY",
    [resource],
    {
      ...defaultExtensionOptions,
      folderStructure: "CourseSectionFile",
      ...options,
    }
  )

  await vi.waitFor(() => {
    expect(chromeDownloadMock).toHaveBeenCalledOnce()
  })
  expect(chromeDownloadMock).toHaveBeenCalledWith({
    url: resource.href,
    filename: expectedFileName,
  })
}

describe("Downloader section indices", () => {
  it("prepends a two-digit section index to the file name", async () => {
    await expectDownloadWithOptions(
      {
        prependSectionIndexToFileName: true,
        prependSectionIndexToFolderName: false,
      },
      "Physics/Oscillations/04_lecture.pdf"
    )
  })

  it("keeps the existing section folder name when the option is disabled", async () => {
    await expectDownloadWithOptions(
      { prependSectionIndexToFolderName: false },
      "Physics/Oscillations/lecture.pdf"
    )
  })

  it("prepends a two-digit index to the section folder when enabled", async () => {
    await expectDownloadWithOptions(
      { prependSectionIndexToFolderName: true },
      "Physics/04_Oscillations/lecture.pdf"
    )
  })

  it("does not prepend the section index without section folders", async () => {
    await expectDownloadWithOptions(
      {
        folderStructure: "CourseFile",
        prependSectionIndexToFolderName: true,
      },
      "Physics/lecture.pdf"
    )
  })

  it("keeps the Moodle folder outside the indexed section folder", async () => {
    await expectDownloadWithOptions(
      {
        prependSectionIndexToFolderName: true,
        saveToMoodleFolder: true,
      },
      "Moodle/Physics/04_Oscillations/lecture.pdf"
    )
  })
})
