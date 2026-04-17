import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  completeCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"

/**
 * EuPlătesc IPN (silent URL) — authoritative server-to-server payment signal.
 *
 * Sequence EuPlătesc follows on every transaction:
 *   1. Processes card / 3DS
 *   2. POSTs this endpoint and WAITS for 200 before showing the receipt page
 *   3. Shows receipt + countdown to customer
 *   4. Redirects browser to back_ref (our /checkout/euplatesc/success)
 *
 * Because the IPN fires before the browser redirect, any order placed here
 * will already be visible in the admin by the time the customer sees the
 * EuPlătesc receipt countdown.
 *
 * The /checkout/euplatesc/success page is the fallback in case this handler
 * throws — it will detect no order exists and complete the cart itself.
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
    console.error("[EuPlătesc IPN] EUPLATESC_KEY not configured")
    return res.status(500).send("Configuration error")
  }

  const body = req.body as Record<string, string>

  // ── Hash verification ────────────────────────────────────────────────────────
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
    console.warn("[EuPlătesc IPN] Invalid fp_hash — possible replay or misconfiguration", {
      received: body.fp_hash,
      computed: computedHash,
      invoice_id: body.invoice_id,
    })
    return res.status(400).send("Invalid signature")
  }

  const cartId = `cart_${body.invoice_id}`
  const approved = body.action === "0"

  console.log(
    `[EuPlătesc IPN] invoice=${body.invoice_id} ep_id=${body.ep_id} ` +
    `action=${body.action} message=${body.message} approved=${approved}`
  )

  // ── Declined / error ─────────────────────────────────────────────────────────
  if (!approved) {
    console.log(`[EuPlătesc IPN] Payment declined for cart ${cartId} — no action needed`)
    return res.status(200).send("OK")
  }

  // ── Approved: place the order ────────────────────────────────────────────────
  // Wrapped in try/catch so that any error still returns 200 to EuPlătesc.
  // The /checkout/euplatesc/success redirect serves as the fallback path.
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Fetch everything we need in one graph call
    const { data: carts } = await (query as any).graph({
      entity: "cart",
      fields: [
        "id",
        "order.id",
        "payment_collection.id",
        "payment_collection.payment_sessions.id",
        "payment_collection.payment_sessions.status",
      ],
      filters: { id: cartId },
    })

    const cartData = carts?.[0]

    if (!cartData) {
      console.error(`[EuPlătesc IPN] Cart ${cartId} not found`)
      return res.status(200).send("OK")
    }

    // ── Idempotency guard ──────────────────────────────────────────────────────
    if (cartData.order?.id) {
      console.log(
        `[EuPlătesc IPN] Order ${cartData.order.id} already placed for cart ${cartId} — skipping`
      )
      return res.status(200).send("OK")
    }

    // ── Ensure payment collection exists ──────────────────────────────────────
    let paymentCollectionId: string = cartData.payment_collection?.id

    if (!paymentCollectionId) {
      const { result: col } = await createPaymentCollectionForCartWorkflow(req.scope).run({
        input: { cart_id: cartId },
      })
      paymentCollectionId = (col as { id: string }).id
      console.log(
        `[EuPlătesc IPN] Created payment collection ${paymentCollectionId} for cart ${cartId}`
      )
    }

    // ── Ensure an active payment session exists ────────────────────────────────
    // createPaymentSessionsWorkflow replaces existing sessions for the same
    // provider, so it's safe to call even if one already exists.
    const hasActiveSession = cartData.payment_collection?.payment_sessions?.some(
      (s: { status: string }) => s.status !== "canceled" && s.status !== "error"
    )

    if (!hasActiveSession) {
      await createPaymentSessionsWorkflow(req.scope).run({
        input: {
          payment_collection_id: paymentCollectionId,
          provider_id: "pp_system_default",
        },
      })
      console.log(`[EuPlătesc IPN] Created payment session for cart ${cartId}`)
    }

    // ── Complete the cart (authorize payment + create order) ──────────────────
    // This also fires the order.placed event, which triggers the confirmation email.
    const { result: order } = await completeCartWorkflow(req.scope).run({
      input: { id: cartId },
    })

    console.log(
      `[EuPlătesc IPN] Order ${order.id} placed successfully ` +
      `for cart ${cartId} (ep_id=${body.ep_id})`
    )
  } catch (e: any) {
    // Log but do NOT return a non-200 status — that would cause EuPlătesc to
    // freeze the checkout flow. The success page redirect is the fallback.
    console.error(
      `[EuPlătesc IPN] Error completing cart ${cartId}:`,
      e?.message ?? e
    )
  }

  return res.status(200).send("OK")
}
