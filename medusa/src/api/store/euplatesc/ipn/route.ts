import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

/**
 * EuPlătesc IPN (silent URL) handler.
 *
 * EuPlătesc POSTs to this endpoint server-to-server after every payment attempt,
 * regardless of whether the customer's browser was redirected successfully.
 * This is the authoritative payment confirmation.
 *
 * Response hash field order (MUST match EuPlătesc spec exactly):
 *   amount, curr, invoice_id, ep_id, merch_id, action, message,
 *   approval, timestamp, nonce
 */
function buildHmac(fields: Record<string, string>, hexKey: string): string {
  const hmacStr = Object.values(fields)
    .map((v) => (v.length === 0 ? "-" : `${Buffer.byteLength(v, "utf8")}${v}`))
    .join("")
  const keyBytes = Buffer.from(hexKey, "hex")
  return crypto.createHmac("md5", keyBytes).update(hmacStr, "utf8").digest("hex")
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const key = process.env.EUPLATESC_KEY

  if (!key) {
    console.error("EuPlătesc IPN: EUPLATESC_KEY not configured")
    return res.status(500).send("Configuration error")
  }

  const body = req.body as Record<string, string>

  // Fields used in response hash — order matters
  const signedFields = {
    amount:     body.amount     ?? "",
    curr:       body.curr       ?? "",
    invoice_id: body.invoice_id ?? "",
    ep_id:      body.ep_id      ?? "",
    merch_id:   body.merch_id   ?? "",
    action:     body.action     ?? "",
    message:    body.message    ?? "",
    approval:   body.approval   ?? "",
    timestamp:  body.timestamp  ?? "",
    nonce:      body.nonce      ?? "",
  }

  const computedHash = buildHmac(signedFields, key)

  if ((body.fp_hash ?? "").toLowerCase() !== computedHash.toLowerCase()) {
    console.warn("EuPlătesc IPN: invalid fp_hash", {
      received: body.fp_hash,
      computed: computedHash,
      invoice_id: body.invoice_id,
    })
    return res.status(400).send("Invalid signature")
  }

  const cartId = `cart_${body.invoice_id}`
  const approved = body.action === "0"

  console.log(`EuPlătesc IPN: invoice=${body.invoice_id} ep_id=${body.ep_id} action=${body.action} message=${body.message} approved=${approved}`)

  if (approved) {
    // Payment confirmed by EuPlătesc. The customer's browser should have already
    // hit /checkout/euplatesc/success which calls initiatePaymentSession + placeOrder.
    // This IPN is the fallback for cases where the browser redirect didn't complete.
    //
    // TODO: implement idempotent order completion here once the basic flow is
    // validated in test mode. Steps:
    //   1. Check if the cart is already completed (order exists)
    //   2. If not: initiatePaymentSession(cart, { provider_id: "pp_system_default" })
    //              then completeCartWorkflow
    console.log(`EuPlătesc IPN: payment approved for cart ${cartId}, ep_id=${body.ep_id}`)
  } else {
    console.log(`EuPlătesc IPN: payment failed for cart ${cartId}, message=${body.message}`)
  }

  // EuPlătesc expects a 200 OK response. No specific body required.
  return res.status(200).send("OK")
}
