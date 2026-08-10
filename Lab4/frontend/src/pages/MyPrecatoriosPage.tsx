import type { PrecatorioAsset } from "../blockchain/types";
import {
  formatTimestamp,
  fromCents,
  shortHash,
} from "../blockchain/utils";
import { Panel } from "../components/Panel";

export function MyPrecatoriosPage({
  accountConnected,
  precatorios,
  loading,
  marketplaceUnavailable,
  onApprove,
}: {
  accountConnected: boolean;
  precatorios: PrecatorioAsset[];
  loading: boolean;
  marketplaceUnavailable: boolean;
  onApprove: (tokenId: bigint) => Promise<unknown>;
}) {
  return (
    <Panel
      title="Meus precatórios"
      description="NFTs ERC-721 atualmente pertencentes à carteira conectada."
    >
      {!accountConnected ? (
        <div className="notice">Conecte a carteira para consultar seus NFTs.</div>
      ) : precatorios.length === 0 ? (
        <div className="empty-inline">Nenhum precatório pertence a esta conta.</div>
      ) : (
        <div className="asset-grid">
          {precatorios.map((asset) => (
            <article className="asset-card" key={asset.tokenId.toString()}>
              <div className="asset-card-top">
                <span className="token-badge">#{asset.tokenId.toString()}</span>
                <span className={asset.activeListingId ? "badge active" : "badge"}>
                  {asset.activeListingId
                    ? `Listado · #${asset.activeListingId}`
                    : "Na carteira"}
                </span>
              </div>

              <h3>{fromCents(asset.faceValue)}</h3>
              <dl>
                <div>
                  <dt>Identificador on-chain</dt>
                  <dd title={asset.identifier}>{shortHash(asset.identifier)}</dd>
                </div>
                <div>
                  <dt>Registrado em</dt>
                  <dd>{formatTimestamp(asset.registeredAt)}</dd>
                </div>
              </dl>

              <button
                className="button-secondary"
                disabled={
                  loading ||
                  marketplaceUnavailable ||
                  asset.activeListingId !== 0n
                }
                onClick={() => void onApprove(asset.tokenId)}
              >
                Aprovar marketplace
              </button>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
