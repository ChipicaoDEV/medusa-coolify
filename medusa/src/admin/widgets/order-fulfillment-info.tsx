import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Container, Heading, Badge, Text } from "@medusajs/ui"

const PICKUP_NAME = "Ridicare Personală"

function DeliveryBadge({ isPickup }: { isPickup: boolean }) {
  if (isPickup) {
    return (
      <Badge color="blue" className="gap-x-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Ridicare Personală
      </Badge>
    )
  }
  return (
    <Badge color="orange" className="gap-x-1">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      Livrare Standard
    </Badge>
  )
}

function PaymentBadge({
  isPaid,
  isPickup,
}: {
  isPaid: boolean
  isPickup: boolean
}) {
  if (isPaid) {
    return (
      <Badge color="green" className="gap-x-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Plătit cu cardul
      </Badge>
    )
  }
  return (
    <Badge color="grey" className="gap-x-1">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {isPickup ? "Plată la ridicare" : "Ramburs la livrare"}
    </Badge>
  )
}

const OrderFulfillmentInfo = ({
  data,
}: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const shippingMethodName = data.shipping_methods?.[0]?.name ?? ""
  const isPickup = shippingMethodName === PICKUP_NAME

  const paymentStatus = data.payment_status
  const isPaid =
    paymentStatus === "captured" ||
    paymentStatus === "partially_captured" ||
    paymentStatus === "paid"

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Livrare &amp; Plată</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Text size="xsmall" className="text-ui-fg-subtle font-medium uppercase tracking-wide">
            Metodă de livrare
          </Text>
          <DeliveryBadge isPickup={isPickup} />
        </div>
        <div className="flex flex-col gap-y-1">
          <Text size="xsmall" className="text-ui-fg-subtle font-medium uppercase tracking-wide">
            Metodă de plată
          </Text>
          <PaymentBadge isPaid={isPaid} isPickup={isPickup} />
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderFulfillmentInfo
