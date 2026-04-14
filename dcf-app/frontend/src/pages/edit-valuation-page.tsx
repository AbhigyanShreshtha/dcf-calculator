import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getModel } from "../api/dcf";
import { Card, CardContent } from "../components/ui/card";
import { ValuationWorkspace } from "../features/valuation/valuation-workspace";

export function EditValuationPage() {
  const { id = "" } = useParams();
  const modelQuery = useQuery({
    queryKey: ["models", id],
    queryFn: () => getModel(id),
    enabled: Boolean(id),
  });

  if (modelQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">Loading saved model...</CardContent>
      </Card>
    );
  }

  if (modelQuery.isError || !modelQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-accent">
          {(modelQuery.error as Error | undefined)?.message ?? "Unable to load this model."}
        </CardContent>
      </Card>
    );
  }

  return <ValuationWorkspace mode="edit" modelId={id} initialModel={modelQuery.data} />;
}

