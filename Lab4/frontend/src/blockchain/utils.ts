import { keccak256, toBytes } from "viem";

export function hashIdentifier(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Informe um identificador.");
  }
  return keccak256(toBytes(normalized));
}

export function toInternalUnits(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Use um valor monetário com no máximo duas casas decimais.");
  }

  const [integer, decimal = ""] = normalized.split(".");
  return BigInt(integer) * 100n + BigInt(decimal.padEnd(2, "0"));
}

export function fromInternalUnits(value: bigint) {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const integer = absolute / 100n;
  const decimal = (absolute % 100n).toString().padStart(2, "0");
  return `${sign}R$ ${integer.toLocaleString("pt-BR")},${decimal}`;
}

export function shortAddress(value?: string | null) {
  if (!value) return "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatIndex(value: bigint) {
  const integer = value / 1_000_000n;
  const decimal = (value % 1_000_000n).toString().padStart(6, "0");
  return `${integer}.${decimal}`;
}
