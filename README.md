# Control de Días — Chermisqui

Calendario de **vacaciones y licencias del equipo** de Chermisqui, con base de
datos real (Supabase). Una sola página: los empleados cargan desde el celular
(sin PIN) y el jefe ve/aprueba todo desde el mismo link con un PIN.

**Link:** https://ematiromero98.github.io/chermisqui-control-dias/

## Qué hace

- **Formulario del empleado** (entrada libre): elegís tu nombre → ves tu saldo y
  lo que ya cargaste → elegís tipo y fechas → se envía como **pendiente**. Si las
  fechas caen en un período de cierre, avisa para coordinar (no bloquea).
- **Panel del jefe** (botón "🔒 Panel del jefe" + PIN):
  - **Año**: línea de tiempo anual con feriados **USA (California) y Argentina**
    marcados por color/etiqueta y una franja de **bloqueos de cierres** (filing).
  - **Mes**: calendario con feriados, vencimientos del día y una **nota fiscal**
    del mes (W-2/1099/940/943, CDTFA, 941/DE9, 1040/C-corp, prórrogas Sep/Oct).
  - **Por persona**: asignados vs. tomados, saldo y % de consumo.
  - **Análisis**: KPIs (mes pico, promedio, solapamientos, por tipo, ranking).
  - **Aprobar/rechazar** pendientes, **agregar personas y ausencias**, alertas de
    solapamiento por área y aviso de ausencias que caen en período de cierre.
  - Refresco automático → multiusuario en vivo.

## Base de datos

Proyecto Supabase **EMPLOYEE-PRO** (`ffczbimnuodzcbgsdxbx`). Tablas con prefijo
`chcal_` (distintas del calendario argentino `cal_`). RLS ON sin políticas: todo
el acceso pasa por la Edge Function **`chcal-api`** (service_role). La carga de
empleados es pública (sin PIN); aprobar/editar valida el **PIN del jefe**,
cambiable desde el botón "PIN" del panel. Esquema en
`supabase/migrations/`. Función en `supabase/functions/chcal-api/`.

`demo.html` es la maqueta original autónoma (sin backend), solo de referencia.
