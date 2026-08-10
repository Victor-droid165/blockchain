import type { Address } from "viem";

import type {
  ContractState,
  ProtocolStats,
  SaleRecord,
} from "../blockchain/types";
import {
  formatTimestamp,
  fromCents,
  fromWei,
  shortAddress,
} from "../blockchain/utils";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";

function stateLabel(state: ContractState) {
  if (state.invalidated) return "Invalidado";
  if (state.paused) return "Pausado";
  return "Ativo";
}

export function DashboardPage({
  stats,
  admin,
  nftAddress,
  marketplaceAddress,
  nftState,
  marketplaceState,
  sales,
  precatorioByTokenId,
}: {
  stats: ProtocolStats;
  admin: Address;
  nftAddress: Address;
  marketplaceAddress: Address;
  nftState: ContractState;
  marketplaceState: ContractState;
  sales: SaleRecord[];
  precatorioByTokenId: Map<string, bigint>;
}) {
  const recentSales = sales.slice(0, 10);

  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard label="NFTs emitidos" value={stats.totalMinted.toString()} />
        <StatCard label="Listagens ativas" value={stats.activeListings.toString()} />
        <StatCard label="Ofertas ativas" value={stats.activeOffers.toString()} />
        <StatCard label="Indisponíveis" value={stats.staleListings.toString()} />
        <StatCard label="Vendas concluídas" value={stats.totalSales.toString()} />
        <StatCard
          label="Último preço"
          value={stats.totalSales === 0n ? "—" : fromWei(stats.lastSalePrice)}
        />
        <StatCard
          label="PrecatorioNFT"
          value={stateLabel(nftState)}
          detail={nftState.invalidated ? "Estado terminal" : "ERC-721"}
        />
        <StatCard
          label="Marketplace"
          value={stateLabel(marketplaceState)}
          detail={marketplaceState.invalidated ? "Estado terminal" : "Venda de NFTs"}
        />
      </div>

      <div className="two-column">
        <Panel
          title="Arquitetura em execução"
          description="O frontend conversa diretamente com os proxies on-chain por Viem e a carteira assina as transações."
        >
          <div className="definition-list">
            <span>Administrador</span>
            <code>{admin}</code>
            <span>PrecatorioNFT</span>
            <code>{nftAddress}</code>
            <span>PrecatorioMarketplace</span>
            <code>{marketplaceAddress}</code>
          </div>
        </Panel>

        <Panel
          title="Escopo da PoC"
          description="Cada tokenId representa um precatório individual. O marketplace transfere o NFT completo; não há QTS, DBT, compensação nem atualização monetária nesta versão."
        >
          <div className="result-card">
            <span>
              Token
              <strong>ERC-721</strong>
            </span>
            <span>
              Liquidação
              <strong>ETH de teste</strong>
            </span>
            <span>
              Mercado secundário
              <strong>Oferta (listagem) + demanda (lance)</strong>
            </span>
            <span>
              Encerramento
              <strong>Invalidação permanente</strong>
            </span>
          </div>
        </Panel>
      </div>

      <Panel
        title="Histórico de preços"
        description="Últimas vendas concluídas no mercado secundário, vindas de listagem a preço fixo ou de oferta aceita."
      >
        {recentSales.length === 0 ? (
          <div className="empty-inline">Nenhuma venda concluída ainda.</div>
        ) : (
          <table className="sales-table">
            <thead>
              <tr>
                <th>Precatório</th>
                <th>Preço</th>
                <th>Origem</th>
                <th>Vendedor</th>
                <th>Comprador</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, index) => {
                const faceValue = precatorioByTokenId.get(sale.tokenId.toString());

                return (
                  <tr key={`${sale.tokenId}-${sale.soldAt}-${index}`}>
                    <td>
                      #{sale.tokenId.toString()}
                      {faceValue !== undefined ? ` · ${fromCents(faceValue)}` : ""}
                    </td>
                    <td>{fromWei(sale.price)}</td>
                    <td>
                      <span
                        className={
                          sale.source === "offer" ? "source-tag offer" : "source-tag"
                        }
                      >
                        {sale.source === "offer" ? "Oferta aceita" : "Listagem"}
                      </span>
                    </td>
                    <td>{shortAddress(sale.seller)}</td>
                    <td>{shortAddress(sale.buyer)}</td>
                    <td>{formatTimestamp(sale.soldAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
