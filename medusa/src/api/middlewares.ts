import { defineMiddlewares } from "@medusajs/framework/http"
import express from "express"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/hooks/euplatesc/ipn",
      // type: '*/*' ensures we parse regardless of what Content-Type EuPlătesc sends
      middlewares: [express.urlencoded({ extended: false, type: "*/*" })],
    },
  ],
})
