import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";

import {
  connectInjectedWallet,
  switchInjectedWallet,
} from "../blockchain/client";
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

  const switchAccount = useCallback(async () => {
    setConnecting(true);
    setError(undefined);

    try {
      const connection = await switchInjectedWallet();
      setAccount(connection.account);
      return connection;
    } catch (cause) {
      setError(toFriendlyError(cause));
      throw cause;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(undefined);
    setError(undefined);
  }, []);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;

    const onAccountsChanged = (accounts: string[]) => {
      setAccount((accounts[0] as Address | undefined) ?? undefined);
    };

    provider.on("accountsChanged", onAccountsChanged);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);

  return {
    account,
    connecting,
    error,
    connect,
    switchAccount,
    disconnect,
  };
}
