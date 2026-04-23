import Medusa from "@medusajs/js-sdk"

// Re-use the admin dashboard SDK instance (set at window.__sdk) so we share the auth token
export const sdk: InstanceType<typeof Medusa> = (window as any).__sdk
