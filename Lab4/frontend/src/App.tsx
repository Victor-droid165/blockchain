import { useState } from "react";

import { shortAddress } from "./blockchain/utils";
import { StatusBanner } from "./components/StatusBanner";
import { WalletButton } from "./components/WalletButton";
import { useDeployment } from "./hooks/useDeployment";
import { usePrecatorioProtocol } from "./hooks/usePrecatorioProtocol";
import { useWallet } from "./hooks/useWallet";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MintPrecatorioPage } from "./pages/MintPrecatorioPage";
import { MyPrecatoriosPage } from "./pages/MyPrecatoriosPage";

type Page = "dashboard" | "marketplace" | "meus" | "emitir" | "admin";

const NAV: Array<{ id: Page; label: string }> = [
  { id: "dashboard", label: "Visão geral" },
  { id: "marketplace", label: "Marketplace" },
  { id: "meus", label: "Meus precatórios" },
  { id: "emitir", label: "Emitir NFT" },
  { id: "admin", label: "Administração" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const wallet = useWallet();
  const { deployment, error: deploymentError } = useDeployment();
  const protocol = usePrecatorioProtocol(
    deployment,
    wallet.account,
    wallet.connect,
  );

  const content = (() => {
    if (!deployment) {
      return (
        <div className="empty-state">
          <h2>Deployment local não encontrado</h2>
          <p>{deploymentError ?? "Carregando endereços dos contratos…"}</p>
          <code>npm run chain:node</code>
          <code>npm run chain:deploy:localhost</code>
        </div>
      );
    }

    const nftUnavailable =
      protocol.nftState.paused || protocol.nftState.invalidated;
    const marketplaceUnavailable =
      protocol.marketplaceState.paused ||
      protocol.marketplaceState.invalidated ||
      protocol.nftState.paused ||
      protocol.nftState.invalidated;

    switch (page) {
      case "marketplace":
        return (
          <MarketplacePage
            account={wallet.account}
            precatorios={protocol.precatorios}
            ownedPrecatorios={protocol.ownedPrecatorios}
            listings={protocol.activeListings}
            loading={protocol.loading}
            disabled={marketplaceUnavailable}
            onList={protocol.listPrecatorio}
            onBuy={protocol.buyListing}
            onCancel={protocol.cancelListing}
          />
        );
      case "meus":
        return (
          <MyPrecatoriosPage
            accountConnected={Boolean(wallet.account)}
            precatorios={protocol.ownedPrecatorios}
            loading={protocol.loading}
            marketplaceUnavailable={marketplaceUnavailable}
            onApprove={protocol.approveMarketplace}
          />
        );
      case "emitir":
        return (
          <MintPrecatorioPage
            defaultBeneficiary={wallet.account}
            isAdmin={protocol.isAdmin}
            loading={protocol.loading}
            disabled={nftUnavailable}
            onMint={protocol.mintPrecatorio}
          />
        );
      case "admin":
        return (
          <AdminPage
            isAdmin={protocol.isAdmin}
            nftState={protocol.nftState}
            marketplaceState={protocol.marketplaceState}
            loading={protocol.loading}
            onSetPaused={protocol.setPaused}
            onInvalidate={protocol.invalidate}
          />
        );
      default:
        return (
          <DashboardPage
            stats={protocol.stats}
            admin={deployment.admin}
            nftAddress={deployment.contracts.precatorioNFT}
            marketplaceAddress={deployment.contracts.precatorioMarketplace}
            nftState={protocol.nftState}
            marketplaceState={protocol.marketplaceState}
          />
        );
    }
  })();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">Q/D</div>
          <h1>Quitus & Debitus</h1>
          <p>Marketplace de precatórios representados como NFTs ERC-721.</p>

          <nav>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={page === item.id ? "active" : ""}
                onClick={() => setPage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <span>Rede</span>
          <strong>{deployment?.network ?? "—"}</strong>
          <span>PrecatorioNFT</span>
          <code>
            {shortAddress(deployment?.contracts.precatorioNFT)}
          </code>
          <span>Marketplace</span>
          <code>
            {shortAddress(
              deployment?.contracts.precatorioMarketplace,
            )}
          </code>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">Projeto 4 · PoC</span>
            <h2>{NAV.find((item) => item.id === page)?.label}</h2>
          </div>

          <WalletButton
            account={wallet.account}
            connecting={wallet.connecting}
            onConnect={() =>
              void wallet.connect().then(() => protocol.refresh())
            }
          />
        </header>

        <StatusBanner
          status={protocol.status}
          error={deploymentError ?? wallet.error ?? protocol.error}
        />

        {content}
      </main>
    </div>
  );
}
