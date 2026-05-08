import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Container, Heading, Text, Button, Badge, Input, Switch, toast } from "@medusajs/ui"
import { Photo, PencilSquare, Trash, ArrowUpMini, ArrowDownMini, Plus, XMark } from "@medusajs/icons"

export const config = defineRouteConfig({
  label: "Bannere",
})

type Banner = {
  id: string
  title: string
  subtitle: string | null
  button_text: string | null
  button_link: string | null
  image: string
  sort_order: number
  is_active: boolean
  created_at: string
}

type BannerForm = {
  title: string
  subtitle: string
  button_text: string
  button_link: string
  image: string
  sort_order: number
  is_active: boolean
}

const EMPTY_FORM: BannerForm = {
  title: "",
  subtitle: "",
  button_text: "Vezi oferta",
  button_link: "/store",
  image: "",
  sort_order: 0,
  is_active: true,
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...options })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const BannersPage = () => {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery<{ banners: Banner[] }>({
    queryKey: ["banners"],
    queryFn: () => apiFetch("/admin/banners"),
  })

  const banners = data?.banners ?? []

  const createMutation = useMutation({
    mutationFn: (body: BannerForm) =>
      apiFetch("/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] })
      closeForm()
      toast.success("Banner adăugat cu succes.")
    },
    onError: () => toast.error("Eroare la salvarea bannerului."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: BannerForm & { id: string }) =>
      apiFetch(`/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] })
      closeForm()
      toast.success("Banner actualizat.")
    },
    onError: () => toast.error("Eroare la actualizare."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] })
      toast.success("Banner șters.")
    },
    onError: () => toast.error("Eroare la ștergere."),
  })

  const reorderMutation = useMutation({
    mutationFn: ({ id, sort_order }: { id: string; sort_order: number }) =>
      apiFetch(`/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch(`/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
  })

  const openAdd = () => {
    setEditingBanner(null)
    setForm({ ...EMPTY_FORM, sort_order: banners.length })
    setShowForm(true)
  }

  const openEdit = (b: Banner) => {
    setEditingBanner(b)
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      button_text: b.button_text ?? "",
      button_link: b.button_link ?? "",
      image: b.image,
      sort_order: b.sort_order,
      is_active: b.is_active,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingBanner(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Titlul este obligatoriu.")
    if (!form.image.trim()) return toast.error("Imaginea este obligatorie.")
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, ...form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      const res = await fetch("/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (url) setForm((f) => ({ ...f, image: url }))
      else throw new Error("No URL returned")
    } catch {
      toast.error("Eroare la încărcarea imaginii.")
    } finally {
      setUploading(false)
    }
  }

  const moveUp = (b: Banner, idx: number) => {
    if (idx === 0) return
    const prev = banners[idx - 1]
    reorderMutation.mutate({ id: b.id, sort_order: prev.sort_order })
    reorderMutation.mutate({ id: prev.id, sort_order: b.sort_order })
  }

  const moveDown = (b: Banner, idx: number) => {
    if (idx === banners.length - 1) return
    const next = banners[idx + 1]
    reorderMutation.mutate({ id: b.id, sort_order: next.sort_order })
    reorderMutation.mutate({ id: next.id, sort_order: b.sort_order })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-y-4 p-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Bannere Carusel</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Gestionează imaginile din carouselul de pe pagina principală.
          </Text>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus className="mr-1.5" />
          Adaugă Banner
        </Button>
      </div>

      {/* ── Banner list ── */}
      <Container className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ui-fg-muted">Se încarcă...</div>
        ) : banners.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-y-3 text-center">
            <Photo className="w-10 h-10 text-ui-fg-muted" />
            <Text className="text-ui-fg-muted">Nu există bannere încă.</Text>
            <Button variant="secondary" size="small" onClick={openAdd}>
              Adaugă primul banner
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-ui-border-base">
              <tr className="text-left text-ui-fg-subtle">
                <th className="px-4 py-3 font-medium w-20">Imagine</th>
                <th className="px-4 py-3 font-medium">Titlu / Subtitlu</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium w-24 text-center">Activ</th>
                <th className="px-4 py-3 font-medium w-24 text-center">Ordine</th>
                <th className="px-4 py-3 font-medium w-24 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b, idx) => (
                <tr
                  key={b.id}
                  className="border-b border-ui-border-base last:border-0 hover:bg-ui-bg-subtle transition-colors"
                >
                  {/* Image thumbnail */}
                  <td className="px-4 py-3">
                    <div className="w-16 h-10 rounded-md overflow-hidden bg-ui-bg-component border border-ui-border-base flex-shrink-0">
                      {b.image ? (
                        <img
                          src={b.image}
                          alt={b.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Photo className="w-5 h-5 text-ui-fg-muted" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Title + subtitle */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-ui-fg-base">{b.title}</p>
                    {b.subtitle && (
                      <p className="text-xs text-ui-fg-subtle mt-0.5 line-clamp-1">{b.subtitle}</p>
                    )}
                  </td>

                  {/* Link */}
                  <td className="px-4 py-3">
                    <p className="text-xs text-ui-fg-subtle font-mono truncate max-w-[180px]">
                      {b.button_link || "—"}
                    </p>
                    {b.button_text && (
                      <p className="text-xs text-ui-fg-muted mt-0.5">{b.button_text}</p>
                    )}
                  </td>

                  {/* Active toggle */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: b.id, is_active: checked })
                      }
                    />
                  </td>

                  {/* Sort order */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-x-1">
                      <button
                        onClick={() => moveUp(b, idx)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-ui-bg-component disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Mută sus"
                      >
                        <ArrowUpMini className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-ui-fg-subtle w-4 text-center">{b.sort_order}</span>
                      <button
                        onClick={() => moveDown(b, idx)}
                        disabled={idx === banners.length - 1}
                        className="p-1 rounded hover:bg-ui-bg-component disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Mută jos"
                      >
                        <ArrowDownMini className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-x-1.5">
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded hover:bg-ui-bg-component transition-colors"
                        aria-label="Editează"
                      >
                        <PencilSquare className="w-4 h-4 text-ui-fg-subtle" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Ștergi bannerul "${b.title}"?`)) {
                            deleteMutation.mutate(b.id)
                          }
                        }}
                        className="p-1.5 rounded hover:bg-ui-bg-component transition-colors"
                        aria-label="Șterge"
                      >
                        <Trash className="w-4 h-4 text-ui-fg-subtle hover:text-ui-tag-red-text" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Container>

      {/* ── Add / Edit form panel ── */}
      {showForm && (
        <Container className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Heading level="h2">
              {editingBanner ? "Editează Banner" : "Banner Nou"}
            </Heading>
            <button
              onClick={closeForm}
              className="p-1.5 rounded hover:bg-ui-bg-component transition-colors"
            >
              <XMark className="w-5 h-5 text-ui-fg-subtle" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT — Image upload */}
            <div className="flex flex-col gap-y-3">
              <label className="text-sm font-medium text-ui-fg-base">
                Imagine banner <span className="text-red-500">*</span>
              </label>

              {/* Preview */}
              <div
                className="relative w-full aspect-[16/7] rounded-xl overflow-hidden border-2 border-dashed border-ui-border-base bg-ui-bg-subtle cursor-pointer hover:border-ui-border-interactive transition-colors flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                {form.image ? (
                  <>
                    <img
                      src={form.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-medium">Schimbă imaginea</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-y-2 text-ui-fg-muted">
                    {uploading ? (
                      <p className="text-sm">Se încarcă...</p>
                    ) : (
                      <>
                        <Photo className="w-8 h-8" />
                        <p className="text-sm">Click pentru a încărca imaginea</p>
                        <p className="text-xs">Recomandare: 1920×600px</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                  e.target.value = ""
                }}
              />

              <p className="text-xs text-ui-fg-subtle">
                Sau introdu URL-ul imaginii direct:
              </p>
              <Input
                placeholder="https://..."
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              />
            </div>

            {/* RIGHT — Fields */}
            <div className="flex flex-col gap-y-4">

              <div className="flex flex-col gap-y-1.5">
                <label className="text-sm font-medium text-ui-fg-base">
                  Titlu <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="ex: Materiale de construcții de elită"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <label className="text-sm font-medium text-ui-fg-base">Subtitlu</label>
                <Input
                  placeholder="ex: Livrare rapidă oriunde în țară"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <label className="text-sm font-medium text-ui-fg-base">Text buton</label>
                <Input
                  placeholder="ex: Vezi oferta completă"
                  value={form.button_text}
                  onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <label className="text-sm font-medium text-ui-fg-base">Link destinație</label>
                <Input
                  placeholder="ex: /store  sau  /categories/acoperisuri"
                  value={form.button_link}
                  onChange={(e) => setForm((f) => ({ ...f, button_link: e.target.value }))}
                />
                <p className="text-xs text-ui-fg-subtle">
                  Pagini interne: <code>/store</code>, <code>/products/handle</code>, <code>/categories/handle</code>
                </p>
              </div>

              <div className="flex flex-col gap-y-1.5">
                <label className="text-sm font-medium text-ui-fg-base">Ordine afișare</label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
                  }
                  className="w-24"
                />
              </div>

              <div className="flex items-center gap-x-3 pt-1">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                />
                <label className="text-sm text-ui-fg-base">
                  {form.is_active ? "Activ — vizibil pe site" : "Inactiv — ascuns de pe site"}
                </label>
              </div>

              <div className="flex gap-x-3 pt-2 mt-auto">
                <Button
                  variant="secondary"
                  onClick={closeForm}
                  className="flex-1"
                >
                  Anulează
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={isSaving || uploading}
                  className="flex-1"
                >
                  {editingBanner ? "Salvează modificările" : "Adaugă banner"}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      )}
    </div>
  )
}

export default BannersPage
