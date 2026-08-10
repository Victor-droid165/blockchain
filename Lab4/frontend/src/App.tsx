import { useState } from "react";

import { StatusBanner } from "./components/StatusBanner";
import { WalletButton } from "./components/WalletButton";
import { useDeployment } from "./hooks/useDeployment";
import { useProtocol } from "./hooks/useProtocol";
import { useWallet } from "./hooks/useWallet";
import { CompensationPage } from "./pages/CompensationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FiscalPage } from "./pages/FiscalPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { PrecatoriosPage } from "./pages/PrecatoriosPage";
import { shortAddress } from "./blockchain/utils";

type Page = "dashboard" | "precatorios" | "fiscal" | "compensacao" | "mercado";

const NAV: Array<{ id: Page; label: string }> = [
  { id: "dashboard", label: "Visão geral" },
  { id: "precatorios", label: "Precatórios" },
  { id: "fiscal", label: "Obrigações fiscais" },
  { id: "compensacao", label: "Compensação" },
  { id: "mercado", label: "Mercado" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const wallet = useWallet();
  const { deployment, error: deploymentError } = useDeployment();
  const protocol = useProtocol(deployment, wallet.account, wallet.connect);

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

    switch (page) {
      case "precatorios":
        return (
          <PrecatoriosPage
            defaultBeneficiary={wallet.account}
            loading={protocol.loading}
            onTokenize={protocol.tokenizePrecatorio}
          />
        );
      case "fiscal":
        return (
          <FiscalPage
            defaultDebtor={wallet.account}
            loading={protocol.loading}
            onRegister={protocol.registerFiscalDebt}
            onLookup={protocol.getFiscalDebt}
          />
        );
      case "compensacao":
        return (
          <CompensationPage
            loading={protocol.loading}
            onCompensate={protocol.compensate}
          />
        );
      case "mercado":
        return (
          <MarketplacePage
            orders={protocol.orders}
            loading={protocol.loading}
            onApprove={protocol.approveMarketplace}
            onCreateSell={protocol.createSellOrder}
            onCreateBuy={protocol.createBuyOrder}
            onFill={protocol.fillOrder}
            onCancel={protocol.cancelOrder}
          />
        );
      default:
        return (
          <DashboardPage
            account={wallet.account}
            stats={protocol.stats}
            issuer={deployment.issuer}
            loading={protocol.loading}
            onUpdateIndex={protocol.updateIndex}
            onSync={protocol.syncBalance}
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
          <p>Tokenização, compensação e mercado secundário.</p>
        </div>

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

        <div className="sidebar-footer">
          <span>Rede</span>
          <strong>{deployment?.network ?? "—"}</strong>
          <span>Contrato QTS</span>
          <code>{shortAddress(deployment?.contracts.quitusToken)}</code>
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
            onConnect={() => void wallet.connect().then(() => protocol.refresh())}
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
