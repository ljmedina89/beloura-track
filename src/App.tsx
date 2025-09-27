import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Plane, MapPin, Clock, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode.react'

/**
 * Beloura • Tracking (React + Vite)
 * - Conectado a Google Apps Script (Sheets)
 * - QR apunta a https://tracking.beloura.shop/{code}
 * - No muestra UPS ni peso
 */

// ====== Config ======
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwmaaKNrhDDu8ctmzRtat_huDnIQ3DgwijunBpfKRVsOjYF0NJXQ7SliEMMtVNvkd0/exec'
const PUBLIC_TRACK_BASE = 'https://tracking.beloura.shop'

// ====== Helpers API ======
async function fetchFromAppsScript(tracking: string) {
  const t = (tracking || '').trim().toUpperCase()
  if (!t) throw new Error('Ingresa un número de guía.')
  const url = `${APPS_SCRIPT_URL}?tracking=${encodeURIComponent(t)}`
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Error remoto ${res.status}`)
  const raw = await res.json()
  if (raw.error) throw new Error(raw.error)
  return mapSheetRowToFrontend(raw)
}

function mapSheetRowToFrontend(raw: any) {
  const events = parseTimeline(raw.timeline_json)
  const mapped = {
    tracking: String(raw.code || '').toUpperCase(),
    customerName: raw.client || 'Cliente',
    fromCity: raw.origin || '',
    viaCity: raw.via || '',
    toCity: raw.destination || 'Destino',
    createdAt: raw.created_at || raw.updated_at || '',
    publicUrl: raw.publicUrl || raw.public_url || '',
    events,
  }
  const statusText = (raw.estado_actual || raw.status || '').toString()
  const code = mapStatusToCode(statusText)
  if (!events.length && code) {
    mapped.events = [{ code, label: statusText || code, at: raw.updated_at || new Date().toISOString() }]
  }
  return mapped
}

function parseTimeline(timeline: unknown) {
  if (!timeline) return []
  try {
    const obj = typeof timeline === 'string' ? JSON.parse(timeline) : timeline
    if (!Array.isArray(obj)) return []
    return obj
      .map((e: any) => ({
        code: mapStatusToCode(e.code || e.status || e.label),
        label: e.label || e.status || e.code || '',
        at: e.at || e.time || e.date || null,
      }))
      .filter((e: any) => e.code)
  } catch {
    return []
  }
}

function mapStatusToCode(s: string) {
  if (!s) return ''
  const txt = String(s).toLowerCase()
  if (/entregado|delivered/.test(txt)) return 'DELIVERED'
  if (/ruta|out\s*for\s*delivery|reparto/.test(txt)) return 'OUT_FOR_DELIVERY'
  if (/aduana|customs/.test(txt)) return 'CUSTOMS'
  if (/hub|escala|in\s*transit|tr[aá]nsito|transito/.test(txt)) return 'IN_TRANSIT'
  if (/check-?in|recibido|creado|ingresado/.test(txt)) return 'CHECKIN'
  return 'IN_TRANSIT'
}

// ====== UI helpers ======
const STATUS_ORDER = ['CHECKIN', 'IN_TRANSIT', 'CUSTOMS', 'OUT_FOR_DELIVERY', 'DELIVERED']

function useProgress(events: { code: string }[] | undefined) {
  const safe = Array.isArray(events) ? events : []
  const idx = Math.max(-1, ...safe.map((e) => STATUS_ORDER.indexOf(e.code)))
  return Math.round(((idx + 1) / STATUS_ORDER.length) * 100)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

// ✅ QR seguro con fallback a <img> (corregido: template literal y llaves cerradas)
function QRCodeSafe({ value, size = 112 }: { value: string; size?: number }) {
  const data = String(value ?? '')
  const isQRAvailable = (() => {
    try {
      return !!QRCode && (typeof QRCode === 'function' || typeof QRCode === 'object')
    } catch {
      return false
    }
  })()
  if (isQRAvailable) {
    const QR: any = QRCode
    return React.createElement(QR, { value: data, size, includeMargin: false })
  }
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code"
      style={{ display: 'block', background: '#fff', borderRadius: 12 }}
    />
  )
}

// ====== App ======
export default function App() {
  const [tracking, setTracking] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shipment, setShipment] = useState<any>(null)

  const progress = useProgress(shipment?.events)

  const publicUrl = useMemo(() => {
    if (!shipment) return ''
    return shipment.publicUrl || `${PUBLIC_TRACK_BASE}/${shipment.tracking}`
  }, [shipment])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!tracking.trim()) {
      setError('Ingresa un número de guía.')
      return
    }
    setLoading(true)
    try {
      const data = await fetchFromAppsScript(tracking.trim())
      setShipment(data)
    } catch (err: any) {
      setShipment(null)
      setError(err?.message || 'Error buscando la guía')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0b132b] text-[#e0fbfc] flex flex-col items-center px-4 py-10">
      <motion.h1 initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-bold text-center">
        BELOURA • Tracking
      </motion.h1>
      <p className="text-center text-white/70 mt-2">Convierte cada envío en una experiencia VIP ✈️</p>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="mt-8 w-full max-w-2xl flex gap-3">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Ingresa tu número de guía (ej. BE3204)"
          className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Número de guía"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 text-[#0b132b] font-semibold px-6 py-2 rounded-2xl disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Buscando
            </span>
          ) : (
            'Rastrear'
          )}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-rose-400" role="alert">
          {error}
        </p>
      )}

      {/* Contenido */}
      {shipment ? (
        <div className="w-full max-w-5xl mt-10 grid md:grid-cols-2 gap-6">
          {/* Boarding Pass */}
          <div className="rounded-3xl border border-white/10 bg-[#1c2541] shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm uppercase tracking-widest text-white/70">Tu paquete viaja con estilo</div>
              <div className="flex items-center gap-2 text-white/90">
                <Plane className="w-5 h-5" />
                <span className="font-semibold">BOARDING PASS</span>
              </div>
            </div>

            <div className="my-4 h-px bg-white/10" />

            <div className="grid grid-cols-2 gap-4 text-white">
              <Info label="Cliente" value={shipment.customerName} />
              <Info label="Guía" value={shipment.tracking} />
              <Info label="Origen" value={shipment.fromCity} />
              <Info label="Destino" value={shipment.toCity} />
              <Info label="Fecha" value={formatDate(shipment.createdAt)} />
              <Info label="Progreso" value={`${progress}%`} />
            </div>

            <div className="my-4 h-px bg-white/10" />

            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white p-2">
                <QRCodeSafe value={publicUrl} size={112} />
              </div>
              <div className="text-sm text-white/80">
                <p className="font-semibold">Escanea para ver el tracking en vivo</p>
                <p className="truncate opacity-80">{publicUrl}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-3xl border border-white/10 bg-[#1c2541] shadow-lg p-6">
            <div className="flex items-center gap-2 text-white/90 mb-4">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Ruta del viaje</span>
            </div>
            <Timeline shipment={shipment} />
          </div>

          {/* Mapa estilizado (placeholder) */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1c2541] to-[#172036] shadow-lg p-6 md:col-span-2">
            <div className="flex items-center gap-2 text-white/90 mb-2">
              <MapPin className="w-5 h-5" />
              <span className="font-semibold">Mapa estilizado de ruta</span>
            </div>
            <div className="text-white/70 text-sm">
              (Opcional) Integra un mapa real (Mapbox/Google) cuando quieras.
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Box label="Origen" value={shipment.fromCity} />
              {shipment.viaCity && <Box label="Escala" value={shipment.viaCity} />}
              <Box label="Destino" value={shipment.toCity} />
            </div>
          </div>
        </div>
      ) : null}

      <footer className="mt-16 text-center text-white/40 text-xs">BELOURA © {new Date().getFullYear()} — Demo UI</footer>
    </div>
  )
}

// ====== UI bits ======
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
      <div className="text-lg font-semibold">{value ?? '—'}</div>
    </div>
  )
}

function Timeline({ shipment }: { shipment: any }) {
  const events = Array.isArray(shipment?.events) ? shipment.events : []
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-white/15" />
      {STATUS_ORDER.map((code, i) => {
        const ev = events.find((e: any) => e.code === code)
        const isDone = !!ev
        const isLast = i === STATUS_ORDER.length - 1
        return (
          <motion.div key={code} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative mb-6">
            <div className="absolute -left-1.5 mt-1">
              {isDone ? <CheckCircle className="w-4 h-4 text-emerald-300" /> : <Circle className="w-4 h-4 text-white/40" />}
            </div>
            <div className={`ml-4 p-3 rounded-xl ${isDone ? 'bg-white/10' : 'bg-white/[.04]'}`}>
              <div className="flex items-center gap-2 text-white">
                <Plane className="w-4 h-4" />
                <span className="font-medium">{labelFor(code, shipment)}</span>
              </div>
              <div className="text-sm text-white/70 mt-1">{ev ? formatDate(ev.at) : 'Pendiente'}</div>
            </div>
            {!isLast && <div className="absolute left-2 bottom-[-12px] w-px h-6 bg-gradient-to-b from-white/15 to-transparent" />}
          </motion.div>
        )
      })}
    </div>
  )
}

function Box({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="font-semibold">{value ?? '—'}</p>
    </div>
  )
}

function labelFor(code: string, s: any = {}) {
  const from = s?.fromCity ?? 'origen'
  const via = s?.viaCity
  const map: Record<string, string> = {
    CHECKIN: `Check-in en ${from}`,
    IN_TRANSIT: via ? `Escala en ${via}` : 'En tránsito',
    CUSTOMS: 'Aduana',
    OUT_FOR_DELIVERY: 'En ruta de entrega',
    DELIVERED: 'Entregado',
  }
  return map[code] ?? code
}
