import { useCallback, useState } from "react";
import type { Address } from "viem";

import { connectInjectedWallet } from "../blockchain/client";
import { toFriendlyError } from "../blockchain/errors";

export function useWallet() {
  const [account, setAccount] = useState<Address>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(undefined);

    try {
      const connection = await connectInjectedWallet();
      setAccount(connection.account);
      return connection;
    } catch (cause) {
      setError(toFriendlyError(cause));
      throw cause;
    } finally {
      setConnecting(false);
    }
  }, []);

  return {
    account,
    connecting,
    error,
    connect,
  };
}
