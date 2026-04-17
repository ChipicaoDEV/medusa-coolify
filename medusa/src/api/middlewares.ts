import { defineMiddlewares } from "@medusajs/framework/http"
import express from "express"

export default defineMiddlewares({
  routes: [
    {
      // EuPlătesc IPN posts application/x-www-form-urlencoded, not JSON.
      // Add urlencoded parser before Medusa's default JSON-only body parser.
      matcher: "/store/euplatesc/ipn",
      middlewares: [express.urlencoded({ extended: false })],
    },
  ],
})
