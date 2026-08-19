import { vi } from "vitest"

vi.mock("p-limit", () => ({
  default: vi.fn(() => (fn: () => unknown) => fn()),
}))

vi.mock("@shared/logger", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

vi.stubGlobal("navigator", { userAgent: "Vitest" })
vi.stubGlobal("chrome", {
  action: {
    setBadgeBackgroundColor: vi.fn(),
  },
  downloads: {
    download: vi.fn().mockResolvedValue(1),
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
})
