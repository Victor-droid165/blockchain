import type {
  AdminTarget,
  ContractState,
} from "../blockchain/types";
import { Panel } from "../components/Panel";

function ContractControls({
  title,
  state,
  isAdmin,
  loading,
  onSetPaused,
  onInvalidate,
}: {
  title: string;
  state: ContractState;
  isAdmin: boolean;
  loading: boolean;
  onSetPaused: (paused: boolean) => Promise<unknown>;
  onInvalidate: () => Promise<unknown>;
}) {
  const stateName = state.invalidated
    ? "INVALIDADO"
    : state.paused
      ? "PAUSADO"
      : "ATIVO";

  return (
    <Panel
      title={title}
      description="Pausa é reversível; invalidação é terminal e também bloqueia upgrades futuros."
    >
      <div className="admin-state">
        <span>Estado atual</span>
        <strong>{stateName}</strong>
      </div>

      <div className="admin-actions">
        {!state.invalidated && (
          <button
            className="button-secondary"
            disabled={!isAdmin || loading}
            onClick={() => void onSetPaused(!state.paused)}
          >
            {state.paused ? "Retomar contrato" : "Pausar contrato"}
          </button>
        )}

        <button
          className="button-danger"
          disabled={!isAdmin || loading || state.invalidated}
          onClick={() => {
            const confirmed = window.confirm(
              `Invalidar ${title} permanentemente? Esta operação não pode ser revertida e bloqueia novos upgrades.`,
            );
            if (confirmed) void onInvalidate();
          }}
        >
          {state.invalidated ? "Contrato invalidado" : "Invalidar permanentemente"}
        </button>
      </div>
    </Panel>
  );
}

export function AdminPage({
  isAdmin,
  nftState,
  marketplaceState,
  loading,
  onSetPaused,
  onInvalidate,
}: {
  isAdmin: boolean;
  nftState: ContractState;
  marketplaceState: ContractState;
  loading: boolean;
  onSetPaused: (target: AdminTarget, paused: boolean) => Promise<unknown>;
  onInvalidate: (target: AdminTarget) => Promise<unknown>;
}) {
  return (
    <div className="page-stack">
      {!isAdmin && (
        <div className="notice">
          Os controles administrativos exigem a conta proprietária dos contratos.
        </div>
      )}

      <div className="two-column">
        <ContractControls
          title="PrecatorioNFT"
          state={nftState}
          isAdmin={isAdmin}
          loading={loading}
          onSetPaused={(paused) => onSetPaused("nft", paused)}
          onInvalidate={() => onInvalidate("nft")}
        />

        <ContractControls
          title="PrecatorioMarketplace"
          state={marketplaceState}
          isAdmin={isAdmin}
          loading={loading}
          onSetPaused={(paused) => onSetPaused("marketplace", paused)}
          onInvalidate={() => onInvalidate("marketplace")}
        />
      </div>

      <Panel
        title="Upgrade UUPS"
        description="O upgrade não é exposto como botão no frontend porque exige uma nova implementação compilada e validada. Para a demonstração controlada, use o script de upgrade do workspace blockchain."
      >
        <code className="command-block">
          npm run chain:upgrade-demo:localhost
        </code>
      </Panel>
    </div>
  );
}
