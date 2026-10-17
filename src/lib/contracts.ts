import {
  createClient,
  custom,
  decodeErrorResult,
  fallback,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";

export const CONTRACTS = {
  seedclock: "0x71a94bba25c46d3a8cb834549d5cb738637f046c",
  distributor: "0x147456d867937bba20f5bb4ee85b2e6d899e780e",
  treasury: "0x3d6a89c8751a45dd577a4c1f3b34e71c58236193",
  imd: "0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7",
} as const satisfies Record<string, Address>;

export const LINKS = {
  github: "https://github.com/identity-md-launches/launch-2079-seedclock",
  research: "https://www.anthropic.com/research/ecdsa-curve-origins",
  reproduction:
    "https://github.com/identity-md-launches/launch-2079-seedclock/blob/main/tools/reproduce.py",
  seedSource:
    "https://github.com/identity-md-launches/launch-2079-seedclock/blob/main/src/art/SeedData.sol",
  artSource:
    "https://github.com/identity-md-launches/launch-2079-seedclock/blob/main/src/art/SeedArt.sol",
};

export const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];
export const TOTAL_SUPPLY = 5555n;
export const IMD_THRESHOLD = 10n ** 18n;

export const seedclockAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function publicMinted(address wallet) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(uint256 quantity)",
  "function royaltyConfiguration() view returns (address recipient, address distributorAddress, uint96 bps)",
  "error InvalidQuantity()",
  "error WalletLimit()",
  "error SoldOut()",
  "error IMDRequired()",
  "error IMDUnavailable()",
  "error ValidatorUnavailable()",
]);

export const distributorAbi = parseAbi([
  "function claim() returns (uint256)",
  "function claimable(address holder) view returns (uint256)",
  "error NothingToClaim()",
  "error PaymentFailed()",
  "error NotBound()",
]);

export const imdAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

export interface EthereumProvider {
  request(args: {
    method: string;
    params?: unknown[] | object;
  }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  disconnect?(): Promise<void>;
}

export const publicClient = createClient({
  chain: mainnet,
  transport: fallback(
    RPC_URLS.map((url) => http(url, { timeout: 6500, retryCount: 0 })),
    { retryCount: 0 },
  ),
});

export function clientFor(provider?: EthereumProvider | null) {
  return provider
    ? createClient({
        chain: mainnet,
        transport: custom(provider, { retryCount: 0 }),
      })
    : publicClient;
}

export const etherscanAddress = (address: string) =>
  `https://etherscan.io/address/${address}`;
export const etherscanTx = (hash: string) => `https://etherscan.io/tx/${hash}`;
export const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

const CONTRACT_ERRORS: Record<string, string> = {
  IMDRequired: "Hold at least 1 IMD in this wallet, then try minting again.",
  WalletLimit:
    "This quantity exceeds your lifetime limit of five. Refresh your wallet data and choose fewer clocks.",
  InvalidQuantity: "Choose between 1 and 5 clocks.",
  SoldOut:
    "This quantity is no longer available. Refresh the supply and try a smaller quantity.",
  NothingToClaim:
    "There are no ETH royalties ready to claim for this wallet yet.",
  PaymentFailed:
    "This wallet could not receive ETH. See the distributor contract for the claimTo option.",
  IMDUnavailable:
    "The contract could not check IMD. Try again after the network recovers.",
  ValidatorUnavailable:
    "The transfer validator is unavailable. Try again later.",
};

export function friendlyError(
  error: unknown,
  fallbackMessage = "The request could not finish. Check your connection and try again.",
): string {
  const obj =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const message =
    error instanceof Error
      ? error.message
      : typeof obj.message === "string"
        ? obj.message
        : "";
  if (
    obj.code === 4001 ||
    /user rejected|user denied|rejected the request/i.test(message)
  )
    return "Request declined in your wallet. You can try again when you’re ready.";
  if (obj.code === -32002 || /already pending/i.test(message))
    return "A request is already open in your wallet. Open the wallet to continue.";
  if (/insufficient funds/i.test(message))
    return "You need enough ETH for the network gas fee. Add ETH to this wallet and try again.";
  if (/chain|network/i.test(message) && /switch|wrong|mismatch/i.test(message))
    return "Switch your wallet to Ethereum mainnet, then try again.";
  for (const [name, text] of Object.entries(CONTRACT_ERRORS))
    if (message.includes(name)) return text;
  const candidates: unknown[] = [
    obj.data,
    (obj.cause as Record<string, unknown> | undefined)?.data,
  ];
  for (const data of candidates) {
    const hex =
      typeof data === "string"
        ? data
        : data && typeof data === "object"
          ? (data as Record<string, unknown>).data
          : null;
    if (typeof hex === "string" && /^0x[0-9a-f]+$/i.test(hex)) {
      try {
        const decoded = decodeErrorResult({
          abi: [...seedclockAbi, ...distributorAbi],
          data: hex as Hex,
        });
        if (CONTRACT_ERRORS[decoded.errorName])
          return CONTRACT_ERRORS[decoded.errorName];
      } catch {
        /* Unknown contract errors use the actionable fallback. */
      }
    }
  }
  return fallbackMessage;
}
