import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUOTE_REQUEST_MODULE } from "../../../../modules/quote-request"
import type QuoteRequestModuleService from "../../../../modules/quote-request/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const quoteService = req.scope.resolve<QuoteRequestModuleService>(QUOTE_REQUEST_MODULE)

  try {
    const item = await quoteService.retrieveQuoteRequest(id)
    return res.json({ quote_request: item })
  } catch {
    return res.status(404).json({ error: "Not found" })
  }
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const { status } = req.body as { status: string }

  if (!status || !["new", "read", "responded"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be new, read, or responded." })
  }

  const quoteService = req.scope.resolve<QuoteRequestModuleService>(QUOTE_REQUEST_MODULE)

  const updated = await quoteService.updateQuoteRequests({ id, status })

  return res.json({ quote_request: updated })
}
