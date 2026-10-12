// Configuración pública del Calendario de Chermisqui.
// La anon key es segura de exponer: las tablas chcal_ tienen RLS activado SIN
// políticas, así que por sí sola NO puede leer nada. Todo el acceso pasa por la
// Edge Function 'chcal-api': la carga de empleados es libre (sin PIN) y las
// acciones de jefe (aprobar/editar) validan el PIN del lado servidor.
window.CHCAL_CONFIG = {
  URL: "https://zpwccecovhjmeibxafkg.supabase.co",
  ANON: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwd2NjZWNvdmhqbWVpYnhhZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjM5MTgsImV4cCI6MjA5NTM5OTkxOH0.E6H-a8b-Dze1ugp0KdKIh2SWwLNLb9Pe3BYyLngppC4",
  FN: "chcal-api",
  YEAR: 2026,
  REFRESH_MS: 20000, // refresco automático del panel del jefe
};
