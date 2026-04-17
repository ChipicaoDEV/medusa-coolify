import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

const ACTION_URL = "https://secure.euplatesc.ro/tdsprocess/tranzactd.php"

/**
 * Builds the HMAC-MD5 signature for EuPlătesc.
 *
 * Each field value is prefixed with its byte length.
 * Empty values are replaced with a literal "-".
 * Key is hex-decoded before use.
 */
function buildHmac(fields: Record<string, string>, hexKey: string): string {
  const hmacStr = Object.values(fields)
    .map((v) => (v.length === 0 ? "-" : `${Buffer.byteLength(v, "utf8")}${v}`))
    .join("")
  const keyBytes = Buffer.from(hexKey, "hex")
  return crypto.createHmac("md5", keyBytes).update(hmacStr, "utf8").digest("hex")
}

function utcTimestamp(): string {
  const now = new Date()
  const p = (n: number) => n.toString().padStart(2, "0")
  // Format: YYYYMMDDHHmmSS (14 chars, 4-digit year, GMT)
  return (
    now.getUTCFullYear().toString() +
    p(now.getUTCMonth() + 1) +
    p(now.getUTCDate()) +
    p(now.getUTCHours()) +
    p(now.getUTCMinutes()) +
    p(now.getUTCSeconds())
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const mid = process.env.EUPLATESC_MID
  const key = process.env.EUPLATESC_KEY
  const storeUrl = process.env.STORE_URL || "https://test.orizont-srl.ro"
  const backendUrl = process.env.BACKEND_URL || "https://admin.orizont-srl.ro"

  if (!mid || !key) {
    return res.status(500).json({ error: "Configurație EuPlătesc lipsă pe server." })
  }

  const { cart_id, total, country_code } = req.body as {
    cart_id?: string
    total?: number
    country_code?: string
  }

  if (!cart_id || !total || total <= 0 || !country_code) {
    return res.status(400).json({ error: "Date invalide pentru inițierea plății." })
  }

  // Medusa v2 store API returns cart totals in major currency units (RON, not bani).
  const amount = Number(total).toFixed(2)
  const curr = "RON"
  // invoice_id max 45 chars. Strip "cart_" prefix → ~22 char ULID.
  const invoiceId = cart_id.replace(/^cart_/, "").slice(0, 45)
  const orderDesc = "Comanda Orizont"
  const timestamp = utcTimestamp()
  const nonce = crypto.randomBytes(16).toString("hex") // 32 hex chars

  // Signed fields — order MUST match EuPlătesc spec exactly
  const signedFields = {
    amount,
    curr,
    invoice_id: invoiceId,
    order_desc: orderDesc,
    merch_id: mid,
    timestamp,
    nonce,
  }
  const fpHash = buildHmac(signedFields, key)

  // Redirect URLs (not in hash)
  const backRef = `${storeUrl}/${country_code}/checkout/euplatesc/success?cart_id=${cart_id}`
  const cancelBackRef = `${storeUrl}/${country_code}/checkout/euplatesc/fail?cart_id=${cart_id}`
  const silentUrl = `${backendUrl}/store/euplatesc/ipn`

  // Fetch cart for billing pre-fill (best-effort — missing fields are just omitted)
  let billingFields: Record<string, string> = {}
  try {
    const cartService = req.scope.resolve(Modules.CART) as any
    const cart = await cartService.retrieveCart(cart_id, {
      relations: ["billing_address"],
    })
    const addr = cart?.billing_address
    if (addr) {
      if (addr.first_name) billingFields.fname = addr.first_name
      if (addr.last_name)  billingFields.lname  = addr.last_name
      if (addr.address_1)  billingFields.add    = addr.address_1
      if (addr.city)       billingFields.city   = addr.city
      if (addr.postal_code) billingFields.zip   = addr.postal_code
      if (addr.country_code) billingFields.country = addr.country_code.toUpperCase()
      if (addr.phone)      billingFields.phone  = addr.phone
    }
    if (cart?.email) billingFields.email = cart.email
  } catch {
    // Non-fatal — EuPlătesc works fine without pre-fill
  }

  return res.json({
    action_url: ACTION_URL,
    form_fields: {
      // Signed fields
      ...signedFields,
      fp_hash: fpHash,
      // Redirect fields (not signed)
      back_ref: backRef,
      cancel_back_ref: cancelBackRef,
      // Server-to-server IPN callback (not signed)
      "ExtraData[silenturl]": silentUrl,
      // Redirect method: GET so our success page can read query params
      "ExtraData[ep_method]": "get",
      // Pre-filled billing (not signed)
      ...billingFields,
    },
  })
}
