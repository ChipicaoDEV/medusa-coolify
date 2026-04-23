import { model } from "@medusajs/framework/utils"

const QuoteRequest = model.define("quote_request", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  product_title: model.text(),
  variant_id: model.text().nullable(),
  quantity: model.number(),
  delivery_type: model.text(),
  full_name: model.text(),
  phone: model.text(),
  email: model.text(),
  address: model.text().nullable(),
  status: model.text().default("new"),
})

export default QuoteRequest
