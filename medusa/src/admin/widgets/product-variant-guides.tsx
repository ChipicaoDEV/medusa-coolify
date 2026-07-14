import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { useState } from "react"

type Guide = { name: string; url: string }
type MetaEntry = { key: string; value: string }

const isPrimitive = (v: unknown): v is string | number | boolean =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean"

const ProductVariantGuidesWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProductVariant>) => {
  const metadata = (data.metadata as Record<string, unknown>) ?? {}

  // ── Guides (fișă tehnică / documente) ───────────────────────────────────────
  const existingGuides: Guide[] = Array.isArray(metadata.guides) ? (metadata.guides as Guide[]) : []

  const [guides, setGuides] = useState<Guide[]>(existingGuides)
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
          metadata: { ...metadata, guides: updated },
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

  // ── Alte metadate (chei simple text) ────────────────────────────────────────
  const initialMetaEntries: MetaEntry[] = Object.entries(metadata)
    .filter(([k, v]) => k !== "guides" && isPrimitive(v) && String(v).trim() !== "")
    .map(([k, v]) => ({ key: k, value: String(v) }))

  const [metaEntries, setMetaEntries] = useState<MetaEntry[]>(initialMetaEntries)
  const [metaKey, setMetaKey] = useState("")
  const [metaValue, setMetaValue] = useState("")
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaFeedback, setMetaFeedback] = useState<string | null>(null)

  const persistMeta = async (updated: MetaEntry[]) => {
    setMetaSaving(true)
    setMetaFeedback(null)
    try {
      const base: Record<string, unknown> = { ...metadata }
      for (const k of Object.keys(base)) {
        if (k !== "guides" && isPrimitive(base[k])) delete base[k]
      }
      for (const e of updated) base[e.key] = e.value

      const res = await fetch(`/admin/products/${data.product_id}/variants/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metadata: base }),
      })
      if (!res.ok) throw new Error()
      setMetaFeedback("Salvat!")
    } catch {
      setMetaFeedback("Eroare la salvare")
    } finally {
      setMetaSaving(false)
      setTimeout(() => setMetaFeedback(null), 2500)
    }
  }

  const addMeta = async () => {
    const k = metaKey.trim()
    const v = metaValue.trim()
    if (!k || !v || metaEntries.some((e) => e.key === k)) return
    const updated = [...metaEntries, { key: k, value: v }]
    setMetaEntries(updated)
    setMetaKey("")
    setMetaValue("")
    await persistMeta(updated)
  }

  const updateMetaValue = (idx: number, value: string) => {
    setMetaEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, value } : e)))
  }

  // Blanking a value removes the row entirely — an empty string wouldn't actually
  // delete the key server-side (Medusa merges metadata on update), it would just
  // leave a ghost key with an empty value.
  const commitMetaValue = async (idx: number) => {
    const current = metaEntries[idx]
    if (!current) return
    if (current.value.trim() === "") {
      const updated = metaEntries.filter((_, i) => i !== idx)
      setMetaEntries(updated)
      await persistMeta(updated)
    } else {
      await persistMeta(metaEntries)
    }
  }

  const removeMeta = async (idx: number) => {
    const updated = metaEntries.filter((_, i) => i !== idx)
    setMetaEntries(updated)
    await persistMeta(updated)
  }

  return (
    <Container className="divide-y p-0">
      {/* ── Documente / fișă tehnică ── */}
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

      {/* ── Alte metadate (chei text simple) ── */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Alte metadate (variantă)</Heading>
        {metaFeedback && (
          <span className={"text-xs font-medium " + (metaFeedback === "Salvat!" ? "text-green-600" : "text-red-500")}>
            {metaFeedback}
          </span>
        )}
      </div>

      <div className="px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">
          Perechi cheie–valoare specifice acestei variante (ex: putere, diametru). Editorul generic de metadata
          Medusa nu permite editarea aici pentru că această variantă are deja câmpul "guides" (o listă),
          așa că folosește secțiunea de mai jos.
        </Text>
      </div>

      {metaEntries.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle italic">
            Nicio metadată adăugată.
          </Text>
        </div>
      ) : (
        <div className="px-6 py-3 flex flex-col gap-y-2">
          {metaEntries.map((e, i) => (
            <div key={e.key} className="flex items-center gap-x-2">
              <span className="w-1/3 text-sm font-medium text-ui-fg-base truncate" title={e.key}>
                {e.key}
              </span>
              <input
                type="text"
                value={e.value}
                onChange={(ev) => updateMetaValue(i, ev.target.value)}
                onBlur={() => commitMetaValue(i)}
                onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur() }}
                disabled={metaSaving}
                className="flex-1 h-8 px-2 rounded-md border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
              />
              <button
                onClick={() => removeMeta(i)}
                disabled={metaSaving}
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
          Adaugă metadată
        </Text>
        <input
          type="text"
          placeholder="Cheie (ex: putere)"
          value={metaKey}
          onChange={(e) => setMetaKey(e.target.value)}
          className="w-full h-9 px-3 rounded-md border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
        />
        <input
          type="text"
          placeholder="Valoare (ex: 1500W)"
          value={metaValue}
          onChange={(e) => setMetaValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addMeta() }}
          className="w-full h-9 px-3 rounded-md border border-ui-border-base bg-ui-bg-field text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
        />
        <Button
          variant="primary"
          size="small"
          onClick={addMeta}
          disabled={!metaKey.trim() || !metaValue.trim() || metaSaving}
          isLoading={metaSaving}
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
