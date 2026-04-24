import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Resend } from "resend"

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRon(n: number | null | undefined): string {
  if (n == null) return "—"
  return (
    new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + " lei"
  )
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr))
}

// ── Email HTML builder ─────────────────────────────────────────────────────────

function buildOrderEmailHtml(order: any): string {
  const items = order.items ?? []
  const addr = order.shipping_address
  const paymentSession = order.payment_collections?.[0]?.payment_sessions?.[0]
  const isPickup = order.shipping_methods?.some((m: any) =>
    m.name?.toLowerCase().includes("ridicare")
  ) ?? false
  const isManualPayment =
    !paymentSession ||
    paymentSession.provider_id?.includes("system_default") ||
    paymentSession.provider_id?.includes("manual") ||
    paymentSession.provider_id?.includes("cash")
  const paymentLabel = isManualPayment
    ? isPickup ? "Plată la ridicare" : "Ramburs la livrare"
    : (paymentSession?.provider_id ?? "—")

  // Prices come from query.graph as plain decimal RON values (e.g. 15.19)
  // item.total is a computed field not returned by query.graph — compute manually
  const shippingAmount: number = order.shipping_methods?.[0]?.amount ?? 0
  const itemsSubtotal: number = items.reduce(
    (sum: number, item: any) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
    0
  )
  // Use summary.original_order_total — the only reliable total from query.graph
  const orderTotal: number = order.summary?.original_order_total ?? (itemsSubtotal + shippingAmount)

  const itemsHtml = items.map((item: any) => {
    const lineTotal = (item.unit_price ?? 0) * (item.quantity ?? 1)
    return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="48" valign="top" style="padding-right:12px;">
              ${item.thumbnail
                ? `<img src="${item.thumbnail}" alt="${item.product_title ?? ""}" width="48" height="48" style="border-radius:8px;object-fit:cover;display:block;border:1px solid #EEEEEE;" />`
                : `<div style="width:48px;height:48px;border-radius:8px;background:#F5F5F5;border:1px solid #EEEEEE;"></div>`
              }
            </td>
            <td valign="middle">
              <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#1A1A1A;">${item.product_title ?? "—"}</p>
              <p style="margin:0;font-size:12px;color:#888888;">${item.quantity ?? 1} × ${formatRon(item.unit_price)}</p>
            </td>
            <td valign="middle" align="right" style="white-space:nowrap;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#1A1A1A;">${formatRon(lineTotal)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `}).join("")

  const addrHtml = addr ? `
    <p style="margin:0;font-size:14px;font-weight:600;color:#1A1A1A;">${addr.first_name ?? ""} ${addr.last_name ?? ""}</p>
    <p style="margin:4px 0 0;font-size:14px;color:#555555;">${addr.address_1 ?? ""}</p>
    ${addr.address_2 ? `<p style="margin:2px 0 0;font-size:14px;color:#555555;">${addr.address_2}</p>` : ""}
    <p style="margin:2px 0 0;font-size:14px;color:#555555;">${[addr.postal_code, addr.city, addr.province].filter(Boolean).join(", ")}</p>
    <p style="margin:2px 0 0;font-size:14px;color:#555555;">${addr.country_code?.toUpperCase() ?? ""}</p>
    ${addr.phone ? `<p style="margin:6px 0 0;font-size:13px;color:#888888;">${addr.phone}</p>` : ""}
  ` : "<p style=\"margin:0;font-size:14px;color:#888888;\">—</p>"

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmare comandă #${order.display_id} - Orizont</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://i.ibb.co/G3pkSmmJ/favico.png" alt="Orizont" width="48" height="48" style="display:block;border-radius:8px;" />
              <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#1A1A1A;">Orizont</p>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #EEEEEE;box-shadow:0 1px 4px rgba(0,0,0,0.06);padding:32px;">

              <!-- Success header -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;border-bottom:1px solid #F0F0F0;">
                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1A1A1A;">Comanda ta a fost plasată cu succes!</h1>
                    <p style="margin:0 0 16px;font-size:14px;color:#888888;">
                      Vei primi actualizări privind statusul comenzii la <strong style="color:#1A1A1A;">${order.email}</strong>
                    </p>
                    <div style="display:inline-block;background:#FFF3E6;border:1px solid rgba(242,122,26,0.25);border-radius:10px;padding:10px 20px;">
                      <span style="font-size:13px;color:#888888;">Număr comandă: </span>
                      <span style="font-size:16px;font-weight:700;color:#F27A1A;">#${order.display_id}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Products -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.05em;">Produse comandate</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${itemsHtml}
                    </table>

                    <!-- Totals -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;border-top:1px solid #F0F0F0;padding-top:16px;">
                      <tr>
                        <td style="font-size:14px;color:#888888;padding-bottom:8px;">Subtotal</td>
                        <td align="right" style="font-size:14px;color:#888888;padding-bottom:8px;">${formatRon(itemsSubtotal)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#888888;padding-bottom:12px;">Livrare</td>
                        <td align="right" style="font-size:14px;color:#888888;padding-bottom:12px;">${shippingAmount > 0 ? formatRon(shippingAmount) : "Gratuită"}</td>
                      </tr>
                      <tr style="border-top:1px solid #F0F0F0;">
                        <td style="font-size:15px;font-weight:700;color:#1A1A1A;padding-top:12px;">Total</td>
                        <td align="right" style="font-size:15px;font-weight:700;color:#1A1A1A;padding-top:12px;">${formatRon(orderTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #F0F0F0;margin:24px 0;" />

              <!-- Address + Details (stacked) -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.05em;">Adresă de livrare</p>
                    ${addrHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.05em;">Metodă de plată</p>
                    <p style="margin:0;font-size:14px;color:#555555;">${paymentLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.05em;">Data comenzii</p>
                    <p style="margin:0;font-size:14px;color:#555555;">${formatDate(order.created_at)}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;border-top:1px solid #F0F0F0;padding-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.STORE_URL ?? "https://orizont-srl.ro"}/cont/comenzi"
                       style="display:inline-block;padding:12px 28px;background:#F27A1A;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                      Vezi comenzile mele
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#AAAAAA;">Orizont · magazin de materiale de construcții</p>
              <p style="margin:4px 0 0;font-size:12px;color:#AAAAAA;">Ai primit acest email deoarece ai plasat o comandă pe site-ul nostru.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Subscriber ─────────────────────────────────────────────────────────────────

export default async function sendOrderConfirmationEmail({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  logger.info(`[order-placed] Sending confirmation for order: ${data.id}`)

  try {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "summary.*",
        "items.*",
        "shipping_address.*",
        "shipping_methods.*",
        "payment_collections.payment_sessions.provider_id",
      ],
      filters: { id: data.id },
    })

    if (!orders?.length) {
      logger.error(`[order-placed] Order ${data.id} not found`)
      return
    }

    const order = orders[0]
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

    const { error } = await resend.emails.send({
      from,
      to: order.email,
      subject: `Confirmare comandă #${order.display_id} - Orizont`,
      html: buildOrderEmailHtml(order),
    })

    if (error) {
      logger.error(`[order-placed] Resend error for order ${data.id}: ${JSON.stringify(error)}`)
      return
    }

    logger.info(`[order-placed] Confirmation email sent to ${order.email} for order #${order.display_id}`)
  } catch (err: any) {
    logger.error(`[order-placed] Failed to send confirmation for ${data.id}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
