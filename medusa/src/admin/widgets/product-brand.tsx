import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { useState } from "react"

const ProductBrandWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const initial = (data.metadata?.brand as string) ?? ""
  const [brand, setBrand] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/admin/products/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: {
            ...(data.metadata as Record<string, unknown> ?? {}),
            brand: brand.trim() || null,
          },
        }),
      })
      if (!res.ok) throw new Error()
      setFeedback("Salvat!")
    } catch {
      setFeedback("Eroare la salvare")
    } finally {
      setSaving(false)
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  const isDirty = brand !== initial

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Producător</Heading>
        {feedback && (
          <span
            className={
              "text-xs font-medium " +
              (feedback === "Salvat!" ? "text-green-600" : "text-red-500")
            }
          >
            {feedback}
          </span>
        )}
      </div>

      <div className="px-6 py-4 flex flex-col gap-y-3">
        <Text size="small" className="text-ui-fg-subtle">
          Apare ca filtru de producător în storefront.
        </Text>
        <div className="flex items-center gap-x-2">
          <input
            type="text"
            placeholder="ex: Wienerberger, LaFarge, Rehau..."
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isDirty) save()
            }}
            className="flex-1 h-9 px-3 rounded-md border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          />
          <Button
            variant="primary"
            size="small"
            onClick={save}
            disabled={!isDirty || saving}
            isLoading={saving}
          >
            Salvează
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductBrandWidget
