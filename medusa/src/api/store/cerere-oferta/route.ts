import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUOTE_REQUEST_MODULE } from "../../../modules/quote-request"
import type QuoteRequestModuleService from "../../../modules/quote-request/service"

type RequestBody = {
  product_id: string
  variant_id?: string | null
  product_title: string
  quantity: number
  delivery_type: "livrare" | "ridicare"
  full_name: string
  phone: string
  email: string
  address?: string | null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as RequestBody
  const { product_id, product_title, quantity, delivery_type, full_name, phone, email } = body

  if (!product_id || !product_title || !quantity || !delivery_type || !full_name || !phone || !email) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const quoteService = req.scope.resolve<QuoteRequestModuleService>(QUOTE_REQUEST_MODULE)

  const quoteRequest = await quoteService.createQuoteRequests({
    product_id,
    variant_id: body.variant_id ?? null,
    product_title,
    quantity: Number(quantity),
    delivery_type,
    full_name: full_name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: delivery_type === "livrare" ? (body.address?.trim() ?? null) : null,
    status: "new",
  })

  return res.status(201).json({ ok: true, id: quoteRequest.id })
}
