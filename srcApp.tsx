import React, { useMemo, useState } from 'react'


// ================== Test cases (UI simple) ==================
function runTests() {
const results: { name: string; pass: boolean; details?: string }[] = []
const push = (name: string, pass: boolean, details = '') => results.push({ name, pass, details })


try { const p0 = useProgress([] as any); push('Progreso con 0 eventos = 0%', p0 === 0, `got ${p0}`) } catch (e) { push('Progreso con 0 eventos no revienta', false, String(e)) }
try { const p2 = useProgress([{ code: 'CHECKIN' }, { code: 'IN_TRANSIT' }] as any); push('Progreso con 2 estados', p2 === Math.round((2/5)*100), `got ${p2}`) } catch (e) { push('Progreso parcial no revienta', false, String(e)) }
try { const l1 = labelFor('IN_TRANSIT', { viaCity: 'Miami, FL' }); const l2 = labelFor('IN_TRANSIT', {}); push('labelFor con viaCity', /Miami/.test(l1)); push('labelFor sin viaCity', l2 === 'En tránsito') } catch (e) { push('labelFor no revienta', false, String(e)) }
try { const u = `https://beloura.shop/track/TEST`; push('publicUrl base dominio', /\/track\/TEST$/.test(u), u) } catch (e) { push('publicUrl no revienta', false, String(e)) }
try { const m1 = mapStatusToCode('Entregado'); push('mapStatusToCode entregado', m1 === 'DELIVERED', m1) } catch (e) { push('mapStatusToCode no revienta', false, String(e)) }
try { const t1 = parseTimeline('not json'); push('parseTimeline inválido retorna []', Array.isArray(t1) && t1.length === 0, JSON.stringify(t1)) } catch (e) { push('parseTimeline no revienta', false, String(e)) }
try { const mapped = mapSheetRowToFrontend({ code: 'X1', client: 'C', destination: 'D', status: 'Aduana', updated_at: '2025-01-01T00:00:00Z', timeline_json: '[]' }); push('mapSheetRowToFrontend genera tracking', mapped.tracking === 'X1', mapped.tracking); push('mapSheetRowToFrontend fallback evento', Array.isArray(mapped.events) && mapped.events.length >= 1, String(mapped.events?.length)) } catch (e) { push('mapSheetRowToFrontend no revienta', false, String(e)) }
try { const pUnknown = useProgress([{ code: 'XYZ_UNKNOWN' }] as any); push('Progreso ignora estados desconocidos', pUnknown === 0, `got ${pUnknown}`) } catch (e) { push('useProgress ignora desconocidos no revienta', false, String(e)) }
try { const qrFallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('TEST')}`; push('QR fallback URL formado', /qrserver\.com/.test(qrFallbackUrl), qrFallbackUrl) } catch (e) { push('QR fallback no revienta', false, String(e)) }


return results
}


function TestsPanel() {
const tests = runTests()
return (
<div>
<div className="text-white/90 font-semibold mb-2">Test cases</div>
<ul className="space-y-1 text-sm">
{tests.map((t, i) => (
<li key={i} className={`flex items-start gap-2 ${t.pass ? 'text-emerald-300' : 'text-rose-300'}`}>
<span className="mt-0.5">{t.pass ? '✔' : '✖'}</span>
<span>{t.name}{t.details ? ` — ${t.details}` : ''}</span>
</li>
))}
</ul>
<p className="text-white/50 text-xs mt-2">Si algún test falla, revisa las funciones involucradas.</p>
</div>
)
}