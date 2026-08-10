import type { Address } from "viem";

import { shortAddress } from "../blockchain/utils";

export function WalletButton({
  account,
  connecting,
  onConnect,
}: {
  account?: Address;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <button className="wallet-button" onClick={onConnect} disabled={connecting}>
      {connecting ? "Conectando…" : account ? shortAddress(account) : "Conectar carteira"}
    </button>
  );
}
