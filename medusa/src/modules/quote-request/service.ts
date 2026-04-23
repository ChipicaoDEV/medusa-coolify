import { MedusaService } from "@medusajs/framework/utils"
import QuoteRequest from "./models/quote-request"

class QuoteRequestModuleService extends MedusaService({ QuoteRequest }) {}

export default QuoteRequestModuleService
