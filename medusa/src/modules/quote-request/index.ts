import { Module } from "@medusajs/framework/utils"
import QuoteRequestModuleService from "./service"

export const QUOTE_REQUEST_MODULE = "quoteRequest"

export default Module(QUOTE_REQUEST_MODULE, {
  service: QuoteRequestModuleService,
})
