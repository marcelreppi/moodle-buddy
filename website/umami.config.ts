import { DOMAIN } from "./constants"
import type { TrackerConfig } from "./types/umami"

export const UMAMI_BASE_URL = "https://umami.marcelreppi.com";

export const UMAMI_SCRIPT = `${UMAMI_BASE_URL}/script.js`;

export const TRACK_ENDPOINT = "/api/send";

export const TRACK_ENDPOINT_FULL_URL = `${UMAMI_BASE_URL}${TRACK_ENDPOINT}`;

const DEV_CONFIG: TrackerConfig = {
  websiteId: "49bf16ab-5ee4-4e38-9454-cac8f47e03e4",
  scriptSrc: UMAMI_SCRIPT
}

const PROD_CONFIG: TrackerConfig = {
  websiteId: "125b2ab7-46a5-4f4a-a652-23162a362b7d",
  scriptSrc: UMAMI_SCRIPT,
  domain: DOMAIN
}

const IS_PROD = process?.env?.VERCEL_ENV === "production"

export const TRACKER_CONFIG = IS_PROD ? PROD_CONFIG : DEV_CONFIG
