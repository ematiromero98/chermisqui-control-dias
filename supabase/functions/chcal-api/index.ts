import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
);

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
    if (!cfg || String(pin ?? '') !== String(cfg.pin_admin)) return json({ error: 'PIN incorrecto' }, 401);
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
