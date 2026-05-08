import { model } from "@medusajs/framework/utils"

const Banner = model.define("banner", {
  id: model.id({ prefix: "ban" }).primaryKey(),
  title: model.text(),
  subtitle: model.text().nullable(),
  button_text: model.text().nullable(),
  button_link: model.text().nullable(),
  image: model.text(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default Banner
