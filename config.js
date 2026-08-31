// Configuración pública del Calendario de Chermisqui.
// La anon key es segura de exponer: las tablas chcal_ tienen RLS activado SIN
// políticas, así que por sí sola NO puede leer nada. Todo el acceso pasa por la
// Edge Function 'chcal-api': la carga de empleados es libre (sin PIN) y las
// acciones de jefe (aprobar/editar) validan el PIN del lado servidor.
window.CHCAL_CONFIG = {
  URL: "https://ffczbimnuodzcbgsdxbx.supabase.co",
  ANON: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmY3piaW1udW9kemNiZ3NkeGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMDk5OTIsImV4cCI6MjEwMTY4NTk5Mn0.askaC0kqNdzoxYhJhmzEKPOiW5n9QlbBrF5U1pqRlBE",
  FN: "chcal-api",
  YEAR: 2026,
  REFRESH_MS: 20000, // refresco automático del panel del jefe
};
