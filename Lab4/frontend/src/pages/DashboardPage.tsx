import type { Address } from "viem";

import type {
  ContractState,
  ProtocolStats,
} from "../blockchain/types";
import {
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
}: {
  stats: ProtocolStats;
  admin: Address;
  nftAddress: Address;
  marketplaceAddress: Address;
  nftState: ContractState;
  marketplaceState: ContractState;
}) {
  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard label="NFTs emitidos" value={stats.totalMinted.toString()} />
        <StatCard label="Listagens ativas" value={stats.activeListings.toString()} />
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
              Upgrade
              <strong>UUPS</strong>
            </span>
            <span>
              Encerramento
              <strong>Invalidação permanente</strong>
            </span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
