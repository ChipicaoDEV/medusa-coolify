import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

const ACTION_URL = "https://secure.euplatesc.ro/tdsprocess/tranzactd.php"

/**
 * Builds the HMAC-MD5 signature for EuPlătesc.
 *
 * EuPlătesc signature spec:
 *   data = concat of: len(merch_id)+merch_id, len(invoice_id)+invoice_id,
 *          len(amount)+amount, len(curr)+curr, len(timestamp)+timestamp,
 *          len(nonce)+nonce, len(back_ref)+back_ref
 *   fp_hash = HMAC-MD5(hex2bin(EUPLATESC_KEY), data)
 */
function buildHash(fields: string[], hexKey: string): string {
  const data = fields.map((v) => `${Buffer.byteLength(v, "utf8")}${v}`).join("")
  const keyBytes = Buffer.from(hexKey, "hex")
  return crypto.createHmac("md5", keyBytes).update(data, "utf8").digest("hex")
}

function utcTimestamp(): string {
  const now = new Date()
  const p = (n: number) => n.toString().padStart(2, "0")
  return (
    now.getUTCFullYear().toString().slice(2) + // YY
    p(now.getUTCMonth() + 1) +                 // MM
    p(now.getUTCDate()) +                       // DD
    p(now.getUTCHours()) +                      // HH
    p(now.getUTCMinutes()) +                    // mm
    p(now.getUTCSeconds())                      // ss
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const mid = process.env.EUPLATESC_MID
  const key = process.env.EUPLATESC_KEY
  const storeUrl = process.env.STORE_URL || "https://test.orizont-srl.ro"

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

  // Medusa stores amounts in subunits (bani). Convert to RON with 2 decimals.
  const amount = (total / 100).toFixed(2)
  const curr = "RON"

  // invoice_id: EuPlătesc max 32 chars. Strip "cart_" prefix → ~22 char ULID.
  const invoiceId = cart_id.replace(/^cart_/, "").slice(0, 32)

  const orderDesc = "Comanda Orizont"
  const timestamp = utcTimestamp()
  const nonce = crypto.randomBytes(16).toString("hex") // 32 hex chars

  const backRef = `${storeUrl}/${country_code}/checkout/euplatesc/success?cart_id=${cart_id}`
  const cancelBackRef = `${storeUrl}/${country_code}/checkout/euplatesc/fail?cart_id=${cart_id}`

  // Signature field order matters — must match EuPlătesc spec exactly
  const fpHash = buildHash(
    [mid, invoiceId, amount, curr, timestamp, nonce, backRef],
    key
  )

  return res.json({
    action_url: ACTION_URL,
    form_fields: {
      amount,
      curr,
      invoice_id: invoiceId,
      order_desc: orderDesc,
      merch_id: mid,
      timestamp,
      nonce,
      fp_hash: fpHash,
      back_ref: backRef,
      cancel_back_ref: cancelBackRef,
    },
  })
}
