/**
 * Carga instantánea al pasar entre secciones del panel. Cada pantalla tiene
 * además su propio esqueleto (dentro de Suspense) con la forma final.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-5xl animate-pulse flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-raised" />
        <div className="h-4 w-64 max-w-full rounded bg-raised/60" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-card" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-card" />
    </div>
  );
}
