import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { useState } from "react"

type Guide = { name: string; url: string }

const ProductVariantGuidesWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProductVariant>) => {
  const existing: Guide[] = Array.isArray((data.metadata as any)?.guides)
    ? ((data.metadata as any).guides as Guide[])
    : []

  const [guides, setGuides] = useState<Guide[]>(existing)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const persist = async (updated: Guide[]) => {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/admin/products/${data.product_id}/variants/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: { ...(data.metadata as Record<string, unknown> ?? {}), guides: updated },
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

  const add = async () => {
    const n = name.trim()
    const u = url.trim()
    if (!n || !u) return
    const updated = [...guides, { name: n, url: u }]
    setGuides(updated)
    setName("")
    setUrl("")
    await persist(updated)
  }

  const remove = async (i: number) => {
    const updated = guides.filter((_, idx) => idx !== i)
    setGuides(updated)
    await persist(updated)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Fișă tehnică & documente (variantă)</Heading>
        {feedback && (
          <span className={"text-xs font-medium " + (feedback === "Salvat!" ? "text-green-600" : "text-red-500")}>
            {feedback}
          </span>
        )}
      </div>

      <div className="px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">
          Documente specifice acestei variante (ex: fișă tehnică pentru această dimensiune). Un document cu
          același nume ca unul de la produs îl va înlocui pe cel de la produs, doar pentru această variantă.
        </Text>
      </div>

      {guides.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle italic">
            Niciun document adăugat.
          </Text>
        </div>
      ) : (
        <div className="px-6 py-3 flex flex-col gap-y-1">
          {guides.map((g, i) => (
            <div
              key={i}
              className="flex items-center gap-x-3 py-2 border-b border-ui-border-base last:border-0"
            >
              <svg className="w-4 h-4 text-ui-fg-subtle flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ui-fg-base truncate">{g.name}</p>
                <p className="text-xs text-ui-fg-subtle truncate">{g.url}</p>
              </div>
              <button
                onClick={() => remove(i)}
                disabled={saving}
                className="w-7 h-7 flex items-center justify-center rounded text-ui-fg-subtle hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
                title="Șterge"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 py-4 flex flex-col gap-y-2">
        <Text size="small" weight="plus" className="text-ui-fg-base">
          Adaugă document
        </Text>
        <input
          type="text"
          placeholder="Nume document (ex: Fișă tehnică)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-9 px-3 rounded-md border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
        />
        <input
          type="url"
          placeholder="Link (Google Drive, PDF, etc.)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add() }}
          className="w-full h-9 px-3 rounded-md border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
        />
        <Button
          variant="primary"
          size="small"
          onClick={add}
          disabled={!name.trim() || !url.trim() || saving}
          isLoading={saving}
        >
          Adaugă
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.side.before",
})

export default ProductVariantGuidesWidget
