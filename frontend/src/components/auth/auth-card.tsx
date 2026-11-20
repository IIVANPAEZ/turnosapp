type AuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Links debajo del formulario ("¿No tenés cuenta? Registrate"). */
  footer?: React.ReactNode;
};

/** Encabezado + formulario de las pantallas de acceso (sin tarjeta: se apoya en el fondo). */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
      {footer && <div className="border-t pt-5 text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
