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

// QR seguro con fallback a <img> por si la lib falla
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
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)
