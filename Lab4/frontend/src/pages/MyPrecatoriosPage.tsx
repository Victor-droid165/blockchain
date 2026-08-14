import type { MarketplaceOffer, PrecatorioAsset } from "../blockchain/types";
import {
  formatTimestamp,
  fromCents,
  fromWei,
  shortHash,
} from "../blockchain/utils";
import { Panel } from "../components/Panel";

export function MyPrecatoriosPage({
  accountConnected,
  precatorios,
  incomingOffers,
  loading,
  marketplaceUnavailable,
  onApprove,
  onAcceptOffer,
}: {
  accountConnected: boolean;
  precatorios: PrecatorioAsset[];
  incomingOffers: MarketplaceOffer[];
  loading: boolean;
  marketplaceUnavailable: boolean;
  onApprove: (tokenId: bigint) => Promise<unknown>;
  onAcceptOffer: (offerId: bigint) => Promise<unknown>;
}) {
  const offersByTokenId = new Map<string, MarketplaceOffer[]>();
  for (const offer of incomingOffers) {
    const key = offer.tokenId.toString();
    const bucket = offersByTokenId.get(key) ?? [];
    bucket.push(offer);
    offersByTokenId.set(key, bucket);
  }

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
          {precatorios.map((asset) => {
            const receivedOffers = offersByTokenId.get(asset.tokenId.toString()) ?? [];

            return (
              <article className="asset-card" key={asset.tokenId.toString()}>
                <div className="asset-card-top">
                  <span className="token-badge">#{asset.tokenId.toString()}</span>
                  <span className={asset.activeListingId ? "badge active" : "badge"}>
                    {asset.activeListingId
                      ? `Listado · #${asset.activeListingId}`
                      : asset.marketplaceApproved
                        ? "Aprovado p/ marketplace"
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
                    asset.marketplaceApproved
                  }
                  onClick={() => void onApprove(asset.tokenId)}
                >
                  {asset.marketplaceApproved
                    ? "Marketplace aprovado"
                    : "Aprovar marketplace"}
                </button>

                {receivedOffers.length > 0 && (
                  <div className="offers-received">
                    <span className="offers-received-title">
                      Ofertas recebidas ({receivedOffers.length})
                    </span>
                    {receivedOffers.map((offer) => (
                      <div className="offer-row" key={offer.id.toString()}>
                        <span>{fromWei(offer.amount)}</span>
                        <button
                          className="button-secondary"
                          disabled={loading || marketplaceUnavailable || !offer.executable}
                          title={offer.unavailableReason}
                          onClick={() => void onAcceptOffer(offer.id)}
                        >
                          {offer.executable ? "Aceitar" : "Aprove p/ aceitar"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
