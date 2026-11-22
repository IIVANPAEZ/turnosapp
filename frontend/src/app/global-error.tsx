"use client"; // Reemplaza al layout raíz si falla: trae su propio <html> y estilos.

/**
 * Último recurso si falla el layout raíz. No tiene los estilos globales,
 * así que los colores van escritos acá (mismos tokens: grafito + ámbar).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#121417",
          color: "#ececec",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <title>Algo salió mal · TurnosApp</title>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#9aa0a6", margin: "0 0 20px" }}>
            No pudimos abrir TurnosApp. Revisá tu conexión y probá de nuevo.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#f2a93b",
              color: "#121417",
              border: 0,
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
