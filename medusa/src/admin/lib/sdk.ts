import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})
