import { useEffect, useState } from "react";

import { configureNetwork, loadDeployment } from "../blockchain/client";
import type { Deployment } from "../blockchain/types";

export function useDeployment() {
  const [deployment, setDeployment] = useState<Deployment>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadDeployment()
      .then((loaded) => {
        // Precisa rodar antes de qualquer leitura de contrato: escolhe a
        // chain/RPC certos (Hardhat local, Sepolia, etc.) a partir do
        // deployment carregado.
        configureNetwork(loaded);
        setDeployment(loaded);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Falha ao carregar deployment.");
      });
  }, []);

  return { deployment, error };
}
