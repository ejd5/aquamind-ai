'use client'

/**
 * AQWELIA Care — Catalog browser (client component).
 *
 * Receives the full product list + categories from the server and renders
 * a filterable, searchable grid. Filters update the URL query string so they
 * are shareable/bookmarkable (router.push with shallow-equivalent params).
 *
 * Cart actions are dispatched via fetch() to /api/care/cart/item — the user
 * must be authenticated. Unauthenticated users are redirected to /auth/signin.
 */
import { useState, useMemo, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingCart, AlertTriangle, X, CheckCircle2 } from 'lucide-react'

type Color = 'green' | 'orange' | 'red'

interface Product {
  id: string
  sku: string
  name: string
  brand?: string
  category: Color
  subcategory?: string
  description?: string
  price: number
  currency: string
  unit: string
  stockQty: number
  imageUrl?: string
  regulated: boolean
  hazardLevel?: 'none' | 'low' | 'medium' | 'high'
  active: boolean
}

interface Category {
  slug: string
  name: string
  nameKey: string
  icon?: string
  color?: Color
  sortOrder: number
}

interface Labels {
  search: string
  allCategories: string
  allColors: string
  green: string
  orange: string
  red: string
  addToCart: string
  partnerOnly: string
  outOfStock: string
  inStock: string
  noResults: string
  filter: string
  clear: string
  perUnit: string
}

interface Props {
  products: Product[]
  categories: Category[]
  initialCategory?: string
  initialSubcategory?: string
  initialSearch?: string
  labels: Labels
}

const COLOR_DOT: Record<Color, string> = {
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
}

export function CatalogBrowser({
  products,
  categories,
  initialCategory,
  initialSubcategory,
  initialSearch,
  labels,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [search, setSearch] = useState(initialSearch ?? '')
  const [category, setCategory] = useState(initialCategory ?? '')
  const [subcategory, setSubcategory] = useState(initialSubcategory ?? '')
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  function pushParams(next: { search?: string; category?: string; subcategory?: string }) {
    const params = new URLSearchParams()
    const s = next.search ?? search
    const c = next.category ?? category
    const sc = next.subcategory ?? subcategory
    if (s) params.set('search', s)
    if (c) params.set('category', c)
    if (sc) params.set('subcategory', sc)
    startTransition(() => {
      router.push(`/care/catalogue?${params.toString()}`, { scroll: false })
    })
  }

  function onSearchChange(v: string) {
    setSearch(v)
    pushParams({ search: v })
  }
  function onCategoryChange(v: string) {
    setCategory(v)
    setSubcategory('')
    pushParams({ category: v, subcategory: '' })
  }
  function onSubcategoryChange(v: string) {
    setSubcategory(v)
    pushParams({ subcategory: v })
  }
  function clearFilters() {
    setSearch('')
    setCategory('')
    setSubcategory('')
    startTransition(() => router.push('/care/catalogue', { scroll: false }))
  }

  // Filter the products client-side too (search/filter UX is instant; the URL
  // is just for shareability — the server re-renders the same filtered list
  // when navigating to it directly).
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category && p.category !== category) return false
      if (subcategory && p.subcategory !== subcategory) return false
      if (search && search.trim().length > 0) {
        const s = search.trim().toLowerCase()
        const hay = `${p.name} ${p.brand ?? ''} ${p.sku} ${p.description ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [products, category, subcategory, search])

  async function addToCart(productId: string) {
    try {
      const res = await fetch('/api/care/cart/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      if (res.status === 401) {
        router.push('/auth/signin?callbackUrl=/care/catalogue')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setToast(data?.error ?? labels.addToCart + ' — error')
        return
      }
      setToast(labels.addToCart + ' ✓')
    } catch {
      setToast(labels.addToCart + ' — error')
    }
    setTimeout(() => setToast(null), 2500)
  }

  const subcategories = category
    ? categories.filter((c) => c.color === category)
    : categories

  return (
    <div>
      {/* Filters bar */}
      <div className="rounded-2xl border border-white/40 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {labels.search}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={labels.search}
                className="input-glass w-full !pl-9"
              />
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {labels.filter}
            </label>
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="input-glass w-full"
            >
              <option value="">{labels.allColors}</option>
              <option value="green">{labels.green}</option>
              <option value="orange">{labels.orange}</option>
              <option value="red">{labels.red}</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {labels.allCategories}
            </label>
            <select
              value={subcategory}
              onChange={(e) => onSubcategoryChange(e.target.value)}
              className="input-glass w-full"
            >
              <option value="">{labels.allCategories}</option>
              {subcategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              onClick={clearFilters}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              {labels.clear}
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-sm text-muted-foreground">{labels.noResults}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const isPartnerOnly = p.regulated || !p.active
              const isOutOfStock = p.stockQty <= 0 && !isPartnerOnly
              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Link
                    href={`/care/produit/${p.sku}`}
                    className="block"
                  >
                    <div className="aspect-[4/3] w-full bg-gradient-to-br from-secondary/40 to-background">
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${COLOR_DOT[p.category]}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {p.sku}
                      </span>
                    </div>
                    <Link
                      href={`/care/produit/${p.sku}`}
                      className="mt-2 block font-display text-base font-bold text-foreground hover:text-gold"
                    >
                      {p.name}
                    </Link>
                    {p.brand && (
                      <p className="mt-1 text-xs text-muted-foreground">{p.brand}</p>
                    )}
                    {p.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-lg font-bold text-gold">
                          {p.price.toFixed(2)} €
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {labels.perUnit} {p.unit}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {isPartnerOnly ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span>{labels.partnerOnly}</span>
                          </>
                        ) : isOutOfStock ? (
                          <>
                            <X className="h-3 w-3 text-red-500" />
                            <span>{labels.outOfStock}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span>{labels.inStock}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-3">
                        {isPartnerOnly ? (
                          <Link
                            href="/care/partenaires"
                            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {labels.partnerOnly}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(p.id)}
                            disabled={isOutOfStock}
                            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            {labels.addToCart}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-gold/40 bg-background/95 px-5 py-2.5 text-xs font-semibold shadow-xl backdrop-blur-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
