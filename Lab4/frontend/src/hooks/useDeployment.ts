import { useEffect, useState } from "react";

import { loadDeployment } from "../blockchain/client";
import type { Deployment } from "../blockchain/types";

export function useDeployment() {
  const [deployment, setDeployment] = useState<Deployment>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadDeployment()
      .then(setDeployment)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Falha ao carregar deployment.");
      });
  }, []);

  return { deployment, error };
}
