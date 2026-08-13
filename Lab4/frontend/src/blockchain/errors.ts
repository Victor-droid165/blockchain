import { BaseError, HttpRequestError, UserRejectedRequestError } from "viem";
import { hardhat } from "viem/chains";

import type { Deployment } from "./types";

const LOCAL_RPC_URL = "http://127.0.0.1:8545";

const CONNECTION_ERROR_HINTS = [
  "HTTP request failed",
  "Failed to fetch",
  "fetch failed",
  "Connection refused",
  "ECONNREFUSED",
];

const USER_REJECTION_HINTS = ["User rejected", "User denied"];

/** Extrai uma mensagem textual de qualquer valor lançado, sem quebrar. */
function messageOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }
  return "";
}

/** Concatena a mensagem do erro e de toda a sua cadeia de causas. */
function collectMessages(cause: unknown): string {
  const parts: string[] = [];

  if (cause instanceof BaseError) {
    // BaseError.walk() percorre a cadeia de causas viem.
    cause.walk((err) => {
      parts.push(messageOf(err));
      return false;
    });
    if (cause.shortMessage) parts.push(cause.shortMessage);
    if (cause.details) parts.push(cause.details);
  }

  let current: unknown = cause;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    parts.push(messageOf(current));
    current =
      current instanceof Error
        ? (current as { cause?: unknown }).cause
        : undefined;
  }

  return parts.join(" \u2022 ");
}

function includesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function isConnectionFailure(cause: unknown, combined: string): boolean {
  if (cause instanceof HttpRequestError) return true;

  if (
    cause instanceof BaseError &&
    cause.walk((err) => err instanceof HttpRequestError)
  ) {
    return true;
  }

  return includesAny(combined, CONNECTION_ERROR_HINTS);
}

function isUserRejection(cause: unknown, combined: string): boolean {
  if (cause instanceof UserRejectedRequestError) return true;

  if (
    cause instanceof BaseError &&
    cause.walk((err) => err instanceof UserRejectedRequestError)
  ) {
    return true;
  }

  const code = (cause as { code?: unknown } | null | undefined)?.code;
  if (code === 4001) return true;

  return includesAny(combined, USER_REJECTION_HINTS);
}

/**
 * Converte um erro bruto (frequentemente um erro de rede verboso do viem) em
 * uma mensagem curta e acionável em português, adequada ao StatusBanner.
 */
export function toFriendlyError(
  cause: unknown,
  deployment?: Deployment,
): string {
  const combined = collectMessages(cause);

  if (isUserRejection(cause, combined)) {
    return "Você rejeitou a solicitação na carteira.";
  }

  if (isConnectionFailure(cause, combined)) {
    if (deployment?.chainId === hardhat.id) {
      return `Não foi possível conectar à blockchain local. Verifique se o nó está no ar: rode \`npm run chain:node\` e, em outro terminal, \`npm run chain:deploy:localhost\`.`;
    }

    return "Não foi possível conectar à rede blockchain. Verifique sua conexão e a URL de RPC (VITE_RPC_URL).";
  }

  if (cause instanceof BaseError && cause.shortMessage) {
    return cause.shortMessage;
  }

  if (cause instanceof Error && cause.message) {
    return cause.message;
  }

  return "Ocorreu um erro inesperado.";
}
