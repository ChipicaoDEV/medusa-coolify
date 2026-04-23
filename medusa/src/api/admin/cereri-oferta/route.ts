import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUOTE_REQUEST_MODULE } from "../../../modules/quote-request"
import type QuoteRequestModuleService from "../../../modules/quote-request/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const quoteService = req.scope.resolve<QuoteRequestModuleService>(QUOTE_REQUEST_MODULE)

  const offset = Number(req.query.offset ?? 0)
  const limit = Number(req.query.limit ?? 100)

  const [items, count] = await quoteService.listAndCountQuoteRequests(
    {},
    { skip: offset, take: limit, order: { created_at: "DESC" } }
  )

  return res.json({ quote_requests: items, count, offset, limit })
}
