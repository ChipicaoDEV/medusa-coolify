import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/euplatesc/order?invoice_id=<ULID>
 *
 * Returns the Medusa order ID linked to the given EuPlătesc invoice_id, or
 * null if the order has not been placed yet.
 *
 * Used by the /checkout/euplatesc/success storefront page to detect whether
 * the IPN handler already completed the cart (so it can redirect to the order
 * confirmation page without calling placeOrder again).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const invoiceId = (req.query as Record<string, string>)?.invoice_id

  if (!invoiceId) {
    return res.status(400).json({ error: "invoice_id query param is required" })
  }

  const cartId = `cart_${invoiceId}`

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data: carts } = await (query as any).graph({
      entity: "cart",
      fields: ["order.id"],
      filters: { id: cartId },
    })

    const orderId: string | null = carts?.[0]?.order?.id ?? null

    return res.json({ order_id: orderId })
  } catch (e: any) {
    console.error(`[EuPlătesc /order] Error looking up order for cart ${cartId}:`, e?.message ?? e)
    return res.status(500).json({ error: "Lookup failed" })
  }
}
