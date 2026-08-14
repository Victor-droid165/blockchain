import type { Address } from "viem";

import { shortAddress } from "../blockchain/utils";

export function WalletButton({
  account,
  connecting,
  onConnect,
  onSwitchAccount,
  onDisconnect,
}: {
  account?: Address;
  connecting: boolean;
  onConnect: () => void;
  onSwitchAccount: () => void;
  onDisconnect: () => void;
}) {
  if (!account) {
    return (
      <button className="wallet-button" onClick={onConnect} disabled={connecting}>
        {connecting ? "Conectando…" : "Conectar carteira"}
      </button>
    );
  }

  return (
    <div className="wallet-cluster">
      <button className="wallet-button" type="button" disabled>
        <span className="wallet-dot" aria-hidden="true" />
        {shortAddress(account)}
      </button>
      <button
        className="button-secondary"
        type="button"
        disabled={connecting}
        onClick={onSwitchAccount}
      >
        {connecting ? "Trocando…" : "Trocar conta"}
      </button>
      <button
        className="button-secondary"
        type="button"
        onClick={onDisconnect}
      >
        Sair
      </button>
    </div>
  );
}
