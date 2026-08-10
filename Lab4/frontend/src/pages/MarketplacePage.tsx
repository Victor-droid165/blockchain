import { useMemo, useState } from "react";

import type { MarketplaceOrder } from "../blockchain/types";
import { fromInternalUnits, shortAddress } from "../blockchain/utils";
import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";

export function MarketplacePage({
  orders,
  loading,
  onApprove,
  onCreateSell,
  onCreateBuy,
  onFill,
  onCancel,
}: {
  orders: MarketplaceOrder[];
  loading: boolean;
  onApprove: (value: string) => Promise<unknown>;
  onCreateSell: (value: string, price: bigint) => Promise<unknown>;
  onCreateBuy: (value: string, price: bigint) => Promise<unknown>;
  onFill: (order: MarketplaceOrder, value: string) => Promise<unknown>;
  onCancel: (orderId: bigint) => Promise<unknown>;
}) {
  const [approval, setApproval] = useState("100.00");
  const [sellValue, setSellValue] = useState("100.00");
  const [sellPrice, setSellPrice] = useState("1000000");
  const [buyValue, setBuyValue] = useState("100.00");
  const [buyPrice, setBuyPrice] = useState("1000000");
  const [fillOrderId, setFillOrderId] = useState("");
  const [fillValue, setFillValue] = useState("50.00");

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id.toString() === fillOrderId),
    [fillOrderId, orders],
  );

  return (
    <div className="page-stack">
      <div className="three-column">
        <Panel title="Aprovar QTS" description="Necessário antes de vender QTS pelo marketplace.">
          <form onSubmit={(e) => { e.preventDefault(); void onApprove(approval); }}>
            <FormField label="Limite aprovado (R$ em QTS)" value={approval} onChange={(e) => setApproval(e.target.value)} inputMode="decimal" />
            <button type="submit" disabled={loading}>Aprovar</button>
          </form>
        </Panel>

        <Panel title="Oferta de venda">
          <form onSubmit={(e) => { e.preventDefault(); void onCreateSell(sellValue, BigInt(sellPrice)); }}>
            <FormField label="Quantidade de QTS (R$)" value={sellValue} onChange={(e) => setSellValue(e.target.value)} inputMode="decimal" />
            <FormField label="Preço em wei por unidade interna" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} inputMode="numeric" />
            <button type="submit" disabled={loading}>Criar venda</button>
          </form>
        </Panel>

        <Panel title="Oferta de compra" description="O ETH de teste fica em escrow até execução ou cancelamento.">
          <form onSubmit={(e) => { e.preventDefault(); void onCreateBuy(buyValue, BigInt(buyPrice)); }}>
            <FormField label="Quantidade de QTS (R$)" value={buyValue} onChange={(e) => setBuyValue(e.target.value)} inputMode="decimal" />
            <FormField label="Preço em wei por unidade interna" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} inputMode="numeric" />
            <button type="submit" disabled={loading}>Criar compra</button>
          </form>
        </Panel>
      </div>

      <Panel title="Livro de ordens" description="Últimas dez ordens registradas on-chain.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Lado</th>
                <th>Maker</th>
                <th>Quantidade</th>
                <th>Restante</th>
                <th>Preço</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8}>Nenhuma ordem registrada.</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id.toString()}>
                  <td>#{order.id.toString()}</td>
                  <td>{order.side}</td>
                  <td><code>{shortAddress(order.maker)}</code></td>
                  <td>{fromInternalUnits(order.amount)}</td>
                  <td>{fromInternalUnits(order.remaining)}</td>
                  <td>{order.pricePerUnitWei.toString()} wei</td>
                  <td>{order.active ? "Aberta" : "Encerrada"}</td>
                  <td>
                    {order.active && (
                      <button className="button-secondary" onClick={() => setFillOrderId(order.id.toString())}>
                        Selecionar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="market-actions">
          <FormField label="ID da ordem" value={fillOrderId} onChange={(e) => setFillOrderId(e.target.value)} inputMode="numeric" />
          <FormField label="Quantidade para executar (R$ em QTS)" value={fillValue} onChange={(e) => setFillValue(e.target.value)} inputMode="decimal" />
          <button disabled={!selectedOrder || loading} onClick={() => selectedOrder && void onFill(selectedOrder, fillValue)}>
            Executar parcela
          </button>
          <button className="button-danger" disabled={!selectedOrder || loading} onClick={() => selectedOrder && void onCancel(selectedOrder.id)}>
            Cancelar ordem selecionada
          </button>
        </div>
      </Panel>
    </div>
  );
}
