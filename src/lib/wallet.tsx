import { useCallback, useEffect, useRef, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { friendlyError, RPC_URLS, type EthereumProvider } from "./contracts";

export interface DiscoveredWallet {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EthereumProvider;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const storage = {
  get() {
    try {
      return localStorage.getItem("seedclock-wallet");
    } catch {
      return null;
    }
  },
  set(value: string) {
    try {
      localStorage.setItem("seedclock-wallet", value);
    } catch {
      /* Private browsing still works. */
    }
  },
  clear() {
    try {
      localStorage.removeItem("seedclock-wallet");
    } catch {
      /* Optional persistence. */
    }
  },
};

let smartProvider: EthereumProvider | undefined;
async function getSmartProvider() {
  if (!smartProvider) {
    const { createCoinbaseWalletSDK } = await import("@coinbase/wallet-sdk");
    smartProvider = createCoinbaseWalletSDK({
      appName: "SeedClock",
      appLogoUrl: new URL("favicon.svg", document.baseURI).href,
      appChainIds: [1],
      preference: { options: "smartWalletOnly" },
    }).getProvider() as unknown as EthereumProvider;
  }
  return smartProvider;
}

export function useWallet() {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const reconnected = useRef(false);

  const adopt = useCallback(
    async (next: EthereumProvider, request: boolean) => {
      const accounts = await next.request({
        method: request ? "eth_requestAccounts" : "eth_accounts",
      });
      if (
        !Array.isArray(accounts) ||
        typeof accounts[0] !== "string" ||
        !isAddress(accounts[0])
      )
        return false;
      const chain = await next.request({ method: "eth_chainId" });
      if (typeof chain !== "string" || !/^0x[0-9a-f]+$/i.test(chain))
        throw new Error("Invalid network response");
      setProvider(next);
      setAddress(getAddress(accounts[0]));
      setChainId(Number.parseInt(chain, 16));
      return true;
    },
    [],
  );

  useEffect(() => {
    const announce = (event: Event) => {
      const detail = (event as CustomEvent<DiscoveredWallet>).detail;
      if (!detail?.provider?.request || !detail.info?.uuid || !detail.info.name)
        return;
      setWallets((current) =>
        current.some((w) => w.info.uuid === detail.info.uuid)
          ? current
          : [...current, detail],
      );
      if (!reconnected.current && storage.get() === detail.info.rdns) {
        reconnected.current = true;
        void adopt(detail.provider, false).catch(() => {});
      }
    };
    window.addEventListener("eip6963:announceProvider", announce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    if (storage.get() === "browser" && window.ethereum) {
      reconnected.current = true;
      void adopt(window.ethereum, false).catch(() => {});
    }
    if (storage.get() === "coinbase") {
      reconnected.current = true;
      void getSmartProvider()
        .then((p) => adopt(p, false))
        .catch(() => {});
    }
    return () =>
      window.removeEventListener("eip6963:announceProvider", announce);
  }, [adopt]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setAddress(null);
    setChainId(null);
    setError("");
    setOpen(false);
    storage.clear();
  }, []);

  useEffect(() => {
    if (!provider) return;
    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0];
      if (!Array.isArray(accounts) || !isAddress(String(accounts[0]))) {
        disconnect();
        return;
      }
      setAddress(getAddress(accounts[0] as string));
    };
    const chainChanged = (...args: unknown[]) => {
      setChainId(Number.parseInt(String(args[0]), 16));
      setError("");
    };
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    provider.on?.("disconnect", disconnect);
    return () => {
      provider.removeListener?.("accountsChanged", accountsChanged);
      provider.removeListener?.("chainChanged", chainChanged);
      provider.removeListener?.("disconnect", disconnect);
    };
  }, [provider, disconnect]);

  async function connect(id: string, next?: EthereumProvider) {
    if (connecting) return false;
    setConnecting(id);
    setError("");
    try {
      const selected =
        next ??
        (id === "coinbase" ? await getSmartProvider() : window.ethereum);
      if (!selected) {
        setError(
          "No browser wallet was found. Open this page in a wallet app or choose Coinbase Smart Wallet.",
        );
        return false;
      }
      if (!(await adopt(selected, true))) {
        setError(
          "Your wallet did not share an account. Open it and try connecting again.",
        );
        return false;
      }
      storage.set(id);
      setOpen(false);
      return true;
    } catch (e) {
      setError(
        friendlyError(
          e,
          "The wallet could not connect. Open the wallet and try again.",
        ),
      );
      return false;
    } finally {
      setConnecting(null);
    }
  }

  async function switchNetwork() {
    if (!provider || connecting) return;
    setConnecting("network");
    setError("");
    try {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x1" }],
        });
      } catch (e) {
        if ((e as { code?: number }).code !== 4902) throw e;
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x1",
              chainName: "Ethereum Mainnet",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: RPC_URLS,
              blockExplorerUrls: ["https://etherscan.io"],
            },
          ],
        });
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x1" }],
        });
      }
      const chain = await provider.request({ method: "eth_chainId" });
      setChainId(Number.parseInt(String(chain), 16));
      if (chain !== "0x1")
        setError("Select Ethereum mainnet in your wallet to continue.");
    } catch (e) {
      setError(
        friendlyError(
          e,
          "Ethereum could not be selected. Switch to Ethereum mainnet in your wallet and try again.",
        ),
      );
    } finally {
      setConnecting(null);
    }
  }

  return {
    wallets,
    provider,
    address,
    chainId,
    connecting,
    error,
    open,
    setOpen,
    setError,
    connect,
    disconnect,
    switchNetwork,
  };
}

export type WalletState = ReturnType<typeof useWallet>;

export async function assertSession(
  provider: EthereumProvider,
  expected: Address,
) {
  const chain = await provider.request({ method: "eth_chainId" });
  if (Number.parseInt(String(chain), 16) !== 1)
    throw new Error("Wrong chain: switch to Ethereum");
  const accounts = await provider.request({ method: "eth_accounts" });
  if (
    !Array.isArray(accounts) ||
    String(accounts[0]).toLowerCase() !== expected.toLowerCase()
  )
    throw new Error("Your account changed. Refresh wallet data and try again.");
}
