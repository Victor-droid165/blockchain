import { useMemo, useState } from "react";
import type { Address } from "viem";

import type {
  MarketplaceListing,
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
  loading,
  disabled,
  onList,
  onBuy,
  onCancel,
}: {
  account?: Address;
  precatorios: PrecatorioAsset[];
  ownedPrecatorios: PrecatorioAsset[];
  listings: MarketplaceListing[];
  loading: boolean;
  disabled: boolean;
  onList: (tokenId: bigint, priceEth: string) => Promise<unknown>;
  onBuy: (listing: MarketplaceListing) => Promise<unknown>;
  onCancel: (listingId: bigint) => Promise<unknown>;
}) {
  const availableOwned = useMemo(
    () => ownedPrecatorios.filter((asset) => asset.activeListingId === 0n),
    [ownedPrecatorios],
  );

  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("0.10");

  const assetByTokenId = useMemo(
    () => new Map(precatorios.map((asset) => [asset.tokenId.toString(), asset])),
    [precatorios],
  );

  return (
    <div className="page-stack">
      <Panel
        title="Listar um precatório"
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
