import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { db: { schema: 'chermisqui' } }, // tablas en el schema 'chermisqui'
);

// ── Bloqueo por intentos fallidos de PIN (tabla pin_intentos) ──────────────
// Mismo diseño que comprobantes-cel: una fila por (IP, función). El PIN es
// corto y la función es pública: sin esto se podía probar todo el espacio de
// PINs con un script. 5 fallos en 15 min => 15 min bloqueado. Un PIN vacío no
// cuenta (es la app antes de que el usuario cargue el PIN).
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const BLOQUEO_MS = 15 * 60 * 1000;

// IP real del cliente. Delante de la función está Cloudflare, que pone la IP
// de conexión en cf-connecting-ip y REESCRIBE x-forwarded-for.
function ipDe(req: Request): string {
  const cf = (req.headers.get('cf-connecting-ip') || '').trim();
  if (cf) return cf;
  const xf = (req.headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return xf[0] || 'desconocida';
}

// Comparación en tiempo constante (no corta en el primer carácter distinto).
function pinIgual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let d = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) d |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return d === 0;
}

function respBloqueo(seg: number): Response {
  const min = Math.max(1, Math.ceil(seg / 60));
  return json({ error: `Demasiados intentos, probá de nuevo en ${min} minuto${min === 1 ? '' : 's'}`, bloqueado: true, espera: seg }, 429);
}

// Devuelve null si el PIN es válido; si no, la Response de error a devolver.
// `funcion` separa los contadores (ej. 'qb-api' y 'qb-api:admin').
async function checkPin(req: Request, funcion: string, enviado: string, esperado: string, msgError: string): Promise<Response | null> {
  const ip = ipDe(req);
  const ahora = Date.now();
  const { data: row } = await db.from('pin_intentos')
    .select('fallidos, primer_fallo, bloqueado_hasta').eq('ip', ip).eq('funcion', funcion).maybeSingle();

  const hasta = row?.bloqueado_hasta ? new Date(row.bloqueado_hasta).getTime() : 0;
  if (hasta > ahora) return respBloqueo(Math.ceil((hasta - ahora) / 1000));

  if (esperado !== '' && pinIgual(enviado, esperado)) {
    if (row) await db.from('pin_intentos').delete().eq('ip', ip).eq('funcion', funcion);
    return null;
  }
  if (enviado === '') return json({ error: msgError }, 401);

  // Fallo: acumular dentro de la ventana; un bloqueo vencido arranca de cero.
  let fallidos = 1;
  let primer = new Date(ahora).toISOString();
  if (row && !row.bloqueado_hasta && row.primer_fallo && (ahora - new Date(row.primer_fallo).getTime()) < VENTANA_MS) {
    fallidos = Number(row.fallidos || 0) + 1;
    primer = row.primer_fallo;
  }
  const bloqueado_hasta = fallidos >= MAX_FALLOS ? new Date(ahora + BLOQUEO_MS).toISOString() : null;
  await db.from('pin_intentos').upsert(
    { ip, funcion, fallidos, primer_fallo: primer, bloqueado_hasta, actualizado: new Date(ahora).toISOString() },
    { onConflict: 'ip,funcion' },
  );
  // Limpieza oportunista de filas viejas (más de 1 día sin movimiento).
  await db.from('pin_intentos').delete().lt('actualizado', new Date(ahora - 24 * 3600 * 1000).toISOString());

  if (bloqueado_hasta) return respBloqueo(Math.ceil(BLOQUEO_MS / 1000));
  return json({ error: msgError, restantes: MAX_FALLOS - fallidos }, 401);
}

const TIPOS = new Set(['vac', 'lic', 'est', 'esp']);
const clean = (patch: Record<string, unknown>, allowed: Set<string>) => {
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(patch || {})) if (allowed.has(k)) o[k] = patch[k];
  return o;
};
// Acciones que NO requieren PIN (empleados, entrada libre)
const PUBLIC = new Set(['bootstrap', 'submit']);
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { pin, action } = body ?? {};

  if (!PUBLIC.has(action)) {
    const { data: cfg } = await db.from('chcal_config').select('pin_admin').eq('id', 1).single();
    if (!cfg) return json({ error: 'PIN incorrecto' }, 401);
    const deny = await checkPin(req, 'chcal-api', String(pin ?? ''), String(cfg.pin_admin ?? ''), 'PIN incorrecto');
    if (deny) return deny;
  }

  try {
    switch (action) {
      case 'login':
        return json({ ok: true });

      case 'bootstrap': {
        const { data: personas } = await db.from('chcal_personas').select('*').eq('activo', true).order('orden');
        const { data: ausencias } = await db.from('chcal_ausencias').select('*').order('desde');
        return json({ personas: personas ?? [], ausencias: ausencias ?? [] });
      }

      case 'submit': {
        const { persona_id, tipo, desde, hasta } = body;
        if (!persona_id || !TIPOS.has(tipo) || !isDate(desde) || !isDate(hasta) || hasta < desde)
          return json({ error: 'datos inválidos' }, 400);
        const { data: p } = await db.from('chcal_personas').select('id').eq('id', persona_id).eq('activo', true).single();
        if (!p) return json({ error: 'persona inválida' }, 400);
        const { data, error } = await db.from('chcal_ausencias')
          .insert({ persona_id, tipo, desde, hasta, comentario: (body.comentario ?? '').toString().slice(0, 300) || null, estado: 'pendiente' })
          .select().single();
        if (error) throw error;
        return json({ ok: true, ausencia: data });
      }

      case 'decide': {
        const estado = body.estado;
        if (!body.id || !['aprobada', 'rechazada'].includes(estado)) return json({ error: 'datos inválidos' }, 400);
        const { data, error } = await db.from('chcal_ausencias').update({ estado }).eq('id', body.id).select().single();
        if (error) throw error;
        return json({ ok: true, ausencia: data });
      }

      case 'add_persona': {
        const nombre = String(body.nombre ?? '').trim();
        if (!nombre) return json({ error: 'falta nombre' }, 400);
        const { data, error } = await db.from('chcal_personas').insert({
          nombre, area: body.area ?? null, rol: body.rol ?? null,
          dias_asignados: Number(body.dias_asignados ?? 14), orden: Number(body.orden ?? 99),
        }).select().single();
        if (error) throw error;
        return json({ ok: true, persona: data });
      }

      case 'update_persona': {
        const patch = clean(body.patch, new Set(['nombre', 'area', 'rol', 'dias_asignados', 'activo', 'orden']));
        const { data, error } = await db.from('chcal_personas').update(patch).eq('id', body.id).select().single();
        if (error) throw error;
        return json({ ok: true, persona: data });
      }

      case 'add_ausencia': {
        const { persona_id, tipo, desde, hasta } = body;
        if (!persona_id || !TIPOS.has(tipo) || !isDate(desde) || !isDate(hasta) || hasta < desde)
          return json({ error: 'datos inválidos' }, 400);
        const { data, error } = await db.from('chcal_ausencias')
          .insert({ persona_id, tipo, desde, hasta, comentario: body.comentario ?? null, estado: body.estado ?? 'aprobada' })
          .select().single();
        if (error) throw error;
        return json({ ok: true, ausencia: data });
      }

      case 'update_ausencia': {
        const patch = clean(body.patch, new Set(['tipo', 'desde', 'hasta', 'estado', 'comentario']));
        const { data, error } = await db.from('chcal_ausencias').update(patch).eq('id', body.id).select().single();
        if (error) throw error;
        return json({ ok: true, ausencia: data });
      }

      case 'del_ausencia': {
        await db.from('chcal_ausencias').delete().eq('id', body.id);
        return json({ ok: true });
      }

      case 'set_pin': {
        const np = String(body.new_pin ?? '').trim();
        if (np.length < 4) return json({ error: 'PIN muy corto' }, 400);
        await db.from('chcal_config').update({ pin_admin: np, updated_at: new Date().toISOString() }).eq('id', 1);
        return json({ ok: true });
      }

      default:
        return json({ error: 'accion desconocida' }, 400);
    }
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
