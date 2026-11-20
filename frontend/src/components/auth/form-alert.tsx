import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/auth/actions";

/** Muestra el resultado de una Server Action (error o éxito) arriba del formulario. */
export function FormAlert({ result }: { result: ActionResult | null }) {
  if (!result) return null;

  return result.ok ? (
    <Alert>
      <CircleCheck />
      <AlertDescription>{result.message}</AlertDescription>
    </Alert>
  ) : (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{result.error}</AlertDescription>
    </Alert>
  );
}
