import {
  formatEther,
  getAddress,
  keccak256,
  parseEther,
  toBytes,
  type Address,
} from "viem";

export function hashIdentifier(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Informe um identificador.");
  }

  return keccak256(toBytes(normalized));
}

export function toCents(value: string): bigint {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Use um valor monetário com no máximo duas casas decimais.");
  }

  const [integer, decimal = ""] = normalized.split(".");
  return BigInt(integer) * 100n + BigInt(decimal.padEnd(2, "0"));
}

export function fromCents(value: bigint) {
  const integer = value / 100n;
  const decimal = (value % 100n).toString().padStart(2, "0");
  return `R$ ${integer.toLocaleString("pt-BR")},${decimal}`;
}

export function toWei(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,18})?$/.test(normalized)) {
    throw new Error("Informe um valor válido em ETH.");
  }
  return parseEther(normalized);
}

export function fromWei(value: bigint) {
  return `${formatEther(value)} ETH`;
}

export function shortAddress(value?: string | null) {
  if (!value) return "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function shortHash(value?: string | null) {
  if (!value) return "—";
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function sameAddress(left?: string, right?: string) {
  if (!left || !right) return false;

  try {
    return getAddress(left) === getAddress(right);
  } catch {
    return left.toLowerCase() === right.toLowerCase();
  }
}

export function formatTimestamp(value: bigint) {
  if (value === 0n) return "—";
  return new Date(Number(value) * 1000).toLocaleString("pt-BR");
}

export function asAddress(value: string): Address {
  return getAddress(value.trim());
}

/**
 * O índice do MonetaryOracle usa a mesma precisão fixa de 1e18 que ETH em
 * wei, então a conversão decimal é idêntica — só o domínio muda (fator de
 * correção, não moeda).
 */
export function toIndex(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,18})?$/.test(normalized)) {
    throw new Error("Informe um índice válido (ex.: 1.05).");
  }
  return parseEther(normalized);
}

export function fromIndex(value: bigint) {
  return formatEther(value);
}

/** Valor corrigido = faceValue × índice / 1e18, replicando MonetaryOracle.adjustedValue. */
export function applyIndex(faceValue: bigint, index: bigint): bigint {
  return (faceValue * index) / 1_000_000_000_000_000_000n;
}
