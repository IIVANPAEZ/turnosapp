import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Página temporal para los módulos que todavía no se implementaron. */
export function PagePlaceholder({ sprint, description }: { sprint: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Construction className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">En construcción · {sprint}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
