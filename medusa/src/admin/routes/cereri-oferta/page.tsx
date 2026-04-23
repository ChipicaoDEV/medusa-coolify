import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Container, Heading, Badge, Text, Button, Table } from "@medusajs/ui"
import { sdk } from "../../lib/sdk"

export const config = defineRouteConfig({
  label: "Cereri Ofertă",
})

type QuoteRequest = {
  id: string
  product_id: string
  product_title: string
  variant_id: string | null
  quantity: number
  delivery_type: "livrare" | "ridicare"
  full_name: string
  phone: string
  email: string
  address: string | null
  status: "new" | "read" | "responded"
  created_at: string
}

const STATUS_COLOR: Record<string, "orange" | "blue" | "green"> = {
  new: "orange",
  read: "blue",
  responded: "green",
}

const STATUS_LABEL: Record<string, string> = {
  new: "Nouă",
  read: "Văzută",
  responded: "Răspuns trimis",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const CereriOfertaPage = () => {
  const [selected, setSelected] = useState<QuoteRequest | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ quote_requests: QuoteRequest[]; count: number }>({
    queryKey: ["cereri-oferta"],
    queryFn: () => sdk.client.fetch("/admin/cereri-oferta"),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/cereri-oferta/${id}`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: (_, { id, status }) => {
      queryClient.setQueryData<{ quote_requests: QuoteRequest[]; count: number }>(
        ["cereri-oferta"],
        (old) => {
          if (!old) return old
          return {
            ...old,
            quote_requests: old.quote_requests.map((q) =>
              q.id === id ? { ...q, status: status as QuoteRequest["status"] } : q
            ),
          }
        }
      )
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, status: status as QuoteRequest["status"] } : null)
      }
    },
  })

  const items = data?.quote_requests ?? []
  const newCount = items.filter((q) => q.status === "new").length

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center gap-x-3 px-6 py-4">
          <Button
            variant="transparent"
            size="small"
            onClick={() => setSelected(null)}
            className="text-ui-fg-subtle"
          >
            ← Înapoi
          </Button>
          <Heading level="h1">Cerere Ofertă</Heading>
          <Badge color={STATUS_COLOR[selected.status]}>
            {STATUS_LABEL[selected.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          {/* Product */}
          <div className="flex flex-col gap-y-2 p-4 border border-ui-border-base rounded-xl">
            <Text size="xsmall" className="text-ui-fg-subtle font-semibold uppercase tracking-wider">
              Produs
            </Text>
            <Text className="font-semibold text-base">{selected.product_title}</Text>
            {selected.variant_id && (
              <Text size="small" className="text-ui-fg-subtle">
                Variantă: {selected.variant_id}
              </Text>
            )}
            <div className="flex items-center gap-x-2 mt-1">
              <Text size="small" className="text-ui-fg-subtle">Cantitate dorită:</Text>
              <Text size="small" className="font-bold text-ui-fg-base">{selected.quantity}</Text>
            </div>
          </div>

          {/* Delivery */}
          <div className="flex flex-col gap-y-2 p-4 border border-ui-border-base rounded-xl">
            <Text size="xsmall" className="text-ui-fg-subtle font-semibold uppercase tracking-wider">
              Livrare
            </Text>
            <Text className="font-semibold text-base">
              {selected.delivery_type === "livrare" ? "Livrare la adresă" : "Ridicare personală"}
            </Text>
            {selected.address ? (
              <Text size="small" className="text-ui-fg-subtle">{selected.address}</Text>
            ) : (
              <Text size="small" className="text-ui-fg-muted italic">Fără adresă specificată</Text>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="px-6 py-4">
          <Text size="xsmall" className="text-ui-fg-subtle font-semibold uppercase tracking-wider mb-3">
            Date client
          </Text>
          <div className="grid grid-cols-3 gap-6 p-4 border border-ui-border-base rounded-xl">
            <div className="flex flex-col gap-y-1">
              <Text size="xsmall" className="text-ui-fg-subtle">Nume complet</Text>
              <Text className="font-medium">{selected.full_name}</Text>
            </div>
            <div className="flex flex-col gap-y-1">
              <Text size="xsmall" className="text-ui-fg-subtle">Telefon</Text>
              <Text className="font-medium">{selected.phone}</Text>
            </div>
            <div className="flex flex-col gap-y-1">
              <Text size="xsmall" className="text-ui-fg-subtle">Email</Text>
              <Text className="font-medium">{selected.email}</Text>
            </div>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-x-3 px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">Marchează ca:</Text>
          {(["new", "read", "responded"] as const).map((s) => (
            <Button
              key={s}
              variant={selected.status === s ? "primary" : "secondary"}
              size="small"
              onClick={() => updateStatus({ id: selected.id, status: s })}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
          <Text size="xsmall" className="text-ui-fg-subtle ml-auto">
            Trimisă la {formatDate(selected.created_at)}
          </Text>
        </div>
      </Container>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Heading level="h1">Cereri Ofertă</Heading>
          {newCount > 0 && (
            <Badge color="orange">{newCount} noi</Badge>
          )}
        </div>
        {!isLoading && (
          <Text size="small" className="text-ui-fg-subtle">
            {data?.count ?? 0} cereri total
          </Text>
        )}
      </div>

      {isLoading ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Se încarcă...</Text>
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Nu există cereri de ofertă încă.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Data</Table.HeaderCell>
              <Table.HeaderCell>Client</Table.HeaderCell>
              <Table.HeaderCell>Produs</Table.HeaderCell>
              <Table.HeaderCell>Cant.</Table.HeaderCell>
              <Table.HeaderCell>Livrare</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row
                key={item.id}
                className="cursor-pointer hover:bg-ui-bg-base-hover"
                onClick={() => {
                  const toShow =
                    item.status === "new" ? { ...item, status: "read" as const } : item
                  setSelected(toShow)
                  if (item.status === "new") {
                    updateStatus({ id: item.id, status: "read" })
                  }
                }}
              >
                <Table.Cell>
                  <Text size="small">{formatDate(item.created_at)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="font-medium">{item.full_name}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">{item.phone}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{item.product_title}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{item.quantity}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">
                    {item.delivery_type === "livrare" ? "Livrare" : "Ridicare"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLOR[item.status]}>
                    {STATUS_LABEL[item.status]}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export default CereriOfertaPage
