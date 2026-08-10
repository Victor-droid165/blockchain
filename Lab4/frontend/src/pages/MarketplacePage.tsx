import { useMemo, useState } from "react";
import type { Address } from "viem";

import type {
  MarketplaceListing,
  MarketplaceOffer,
  PrecatorioAsset,
} from "../blockchain/types";
import {
  formatTimestamp,
  fromCents,
  fromWei,
  sameAddress,
  shortAddress,
  shortHash,
} from "../blockchain/utils";
import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";

export function MarketplacePage({
  account,
  precatorios,
  ownedPrecatorios,
  listings,
  myOffers,
  loading,
  disabled,
  onList,
  onBuy,
  onCancel,
  onMakeOffer,
  onCancelOffer,
}: {
  account?: Address;
  precatorios: PrecatorioAsset[];
  ownedPrecatorios: PrecatorioAsset[];
  listings: MarketplaceListing[];
  myOffers: MarketplaceOffer[];
  loading: boolean;
  disabled: boolean;
  onList: (tokenId: bigint, priceEth: string) => Promise<unknown>;
  onBuy: (listing: MarketplaceListing) => Promise<unknown>;
  onCancel: (listingId: bigint) => Promise<unknown>;
  onMakeOffer: (tokenId: bigint, amountEth: string) => Promise<unknown>;
  onCancelOffer: (offerId: bigint) => Promise<unknown>;
}) {
  const availableOwned = useMemo(
    () => ownedPrecatorios.filter((asset) => asset.activeListingId === 0n),
    [ownedPrecatorios],
  );

  const offerable = useMemo(
    () =>
      account
        ? precatorios.filter((asset) => !sameAddress(asset.owner, account))
        : precatorios,
    [account, precatorios],
  );

  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("0.10");

  const [offerTokenId, setOfferTokenId] = useState("");
  const [offerAmount, setOfferAmount] = useState("0.05");

  const assetByTokenId = useMemo(
    () => new Map(precatorios.map((asset) => [asset.tokenId.toString(), asset])),
    [precatorios],
  );

  return (
    <div className="page-stack">
      <div className="two-column">
        <Panel
          title="Listar um precatório (oferta)"
          description="O NFT permanece na carteira do vendedor até a compra. Antes de listar, aprove o marketplace na página “Meus precatórios”."
        >
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onList(BigInt(tokenId), price);
            }}
          >
            <label className="field">
              <span>Precatório</span>
              <select
                value={tokenId}
                onChange={(event) => setTokenId(event.target.value)}
                required
              >
                <option value="">Selecione um NFT</option>
                {availableOwned.map((asset) => (
                  <option
                    key={asset.tokenId.toString()}
                    value={asset.tokenId.toString()}
                  >
                    #{asset.tokenId.toString()} · {fromCents(asset.faceValue)}
                  </option>
                ))}
              </select>
            </label>

            <FormField
              label="Preço (ETH de teste)"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              required
            />

            <button
              type="submit"
              disabled={!account || !tokenId || loading || disabled}
            >
              Criar listagem
            </button>
          </form>
        </Panel>

        <Panel
          title="Fazer uma oferta (demanda)"
          description="Proponha um lance por qualquer precatório, mesmo sem listagem ativa. O ETH fica retido no contrato até o proprietário aceitar ou você cancelar."
        >
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onMakeOffer(BigInt(offerTokenId), offerAmount);
            }}
          >
            <label className="field">
              <span>Precatório</span>
              <select
                value={offerTokenId}
                onChange={(event) => setOfferTokenId(event.target.value)}
                required
              >
                <option value="">Selecione um NFT</option>
                {offerable.map((asset) => (
                  <option
                    key={asset.tokenId.toString()}
                    value={asset.tokenId.toString()}
                  >
                    #{asset.tokenId.toString()} · {fromCents(asset.faceValue)}
                  </option>
                ))}
              </select>
            </label>

            <FormField
              label="Lance (ETH de teste)"
              value={offerAmount}
              onChange={(event) => setOfferAmount(event.target.value)}
              inputMode="decimal"
              required
            />

            <button
              type="submit"
              disabled={!account || !offerTokenId || loading || disabled}
            >
              Enviar oferta
            </button>
          </form>
        </Panel>
      </div>

      {myOffers.length > 0 && (
        <Panel
          title="Suas ofertas enviadas"
          description="Lances ainda ativos aguardando aceite do proprietário atual do NFT."
        >
          <div className="market-grid">
            {myOffers.map((offer) => {
              const asset = assetByTokenId.get(offer.tokenId.toString());

              return (
                <article className="market-card" key={offer.id.toString()}>
                  <div className="market-visual">
                    <span>OFERTA</span>
                    <strong>#{offer.tokenId.toString()}</strong>
                  </div>

                  <div className="market-card-body">
                    <div className="asset-card-top">
                      <span className="token-badge">
                        Oferta #{offer.id.toString()}
                      </span>
                      <span
                        className={
                          offer.executable ? "badge active" : "badge unavailable"
                        }
                      >
                        {offer.executable ? "Ativa" : "Aguardando aprovação"}
                      </span>
                    </div>

                    <h3>{asset ? fromCents(asset.faceValue) : "Precatório NFT"}</h3>

                    <dl>
                      <div>
                        <dt>Seu lance</dt>
                        <dd>{fromWei(offer.amount)}</dd>
                      </div>
                      <div>
                        <dt>Enviada em</dt>
                        <dd>{formatTimestamp(offer.createdAt)}</dd>
                      </div>
                    </dl>

                    {!offer.executable && offer.unavailableReason && (
                      <div className="market-warning">{offer.unavailableReason}</div>
                    )}

                    <button
                      className="button-danger"
                      disabled={loading}
                      onClick={() => void onCancelOffer(offer.id)}
                    >
                      Retirar oferta
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel
        title="Precatórios à venda"
        description="Cada card representa um NFT completo; não existe execução parcial."
      >
        {listings.length === 0 ? (
          <div className="empty-inline">Nenhuma listagem ativa.</div>
        ) : (
          <div className="market-grid">
            {listings.map((listing) => {
              const asset = assetByTokenId.get(listing.tokenId.toString());
              const ownListing = sameAddress(account, listing.seller);

              return (
                <article className="market-card" key={listing.id.toString()}>
                  <div className="market-visual">
                    <span>PREC</span>
                    <strong>#{listing.tokenId.toString()}</strong>
                  </div>

                  <div className="market-card-body">
                    <div className="asset-card-top">
                      <span className="token-badge">
                        Listing #{listing.id.toString()}
                      </span>
                      <span
                        className={
                          listing.executable ? "badge active" : "badge unavailable"
                        }
                      >
                        {listing.executable ? "Ativa" : "Indisponível"}
                      </span>
                    </div>

                    <h3>
                      {asset ? fromCents(asset.faceValue) : "Precatório NFT"}
                    </h3>

                    <dl>
                      <div>
                        <dt>Preço</dt>
                        <dd>{fromWei(listing.price)}</dd>
                      </div>
                      <div>
                        <dt>Vendedor</dt>
                        <dd>{shortAddress(listing.seller)}</dd>
                      </div>
                      {asset && (
                        <div>
                          <dt>Identificador</dt>
                          <dd title={asset.identifier}>
                            {shortHash(asset.identifier)}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>Listado em</dt>
                        <dd>{formatTimestamp(listing.createdAt)}</dd>
                      </div>
                    </dl>

                    {!listing.executable && listing.unavailableReason && (
                      <div className="market-warning">
                        {listing.unavailableReason}
                      </div>
                    )}

                    {ownListing ? (
                      <button
                        className="button-danger"
                        disabled={loading || disabled}
                        onClick={() => void onCancel(listing.id)}
                      >
                        Cancelar listagem
                      </button>
                    ) : (
                      <button
                        disabled={
                          !account ||
                          loading ||
                          disabled ||
                          !listing.executable
                        }
                        onClick={() => void onBuy(listing)}
                      >
                        {listing.executable ? "Comprar NFT" : "Indisponível"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
