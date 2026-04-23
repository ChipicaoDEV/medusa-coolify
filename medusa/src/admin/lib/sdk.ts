import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: window.location.origin,
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})
