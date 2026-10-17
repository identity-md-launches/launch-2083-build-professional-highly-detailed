import { useState } from "react";
import { etherscanAddress, shortAddress } from "../lib/contracts";
import type { WalletState } from "../lib/wallet";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    href: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`,
  },
];

export function WalletControl({ wallet }: { wallet: WalletState }) {
  return (
    <button
      type="button"
      className="button button-wallet"
      aria-label={!wallet.address ? "Connect wallet" : undefined}
      disabled={!!wallet.connecting}
      onClick={() => {
        if (wallet.address && wallet.chainId !== 1) {
          void wallet.switchNetwork();
          return;
        }
        wallet.setError("");
        wallet.setOpen(true);
      }}
    >
      <Icon name="wallet" size={18} />
      <span>
        {wallet.connecting === "network"
          ? "Switching…"
          : wallet.address
            ? wallet.chainId !== 1
              ? "Switch to Ethereum"
              : shortAddress(wallet.address)
            : "Connect"}
      </span>
    </button>
  );
}

export function WalletSheet({ wallet }: { wallet: WalletState }) {
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.ethereum &&
    wallet.wallets.length === 0;
  const [copied, setCopied] = useState(false);
  return (
    <Modal
      title={wallet.address ? "Your wallet" : "Connect a wallet"}
      onClose={() => wallet.setOpen(false)}
    >
      {wallet.address ? (
        <>
          <p className="muted">
            Connected on{" "}
            {wallet.chainId === 1 ? "Ethereum mainnet" : "another network"}.
          </p>
          <p className="wallet-address mono">{wallet.address}</p>
          <div className="wallet-rows">
            {wallet.chainId !== 1 && (
              <button
                type="button"
                disabled={!!wallet.connecting}
                onClick={() => void wallet.switchNetwork()}
              >
                <Icon name="refresh" />
                <span>Switch to Ethereum</span>
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(wallet.address!);
                  setCopied(true);
                } catch {
                  wallet.setError(
                    "Copy is unavailable in this browser. Select and copy the address above.",
                  );
                }
              }}
            >
              <Icon name={copied ? "check" : "copy"} />
              <span>{copied ? "Address copied" : "Copy address"}</span>
            </button>
            <a
              href={etherscanAddress(wallet.address)}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" />
              <span>View account on Etherscan</span>
            </a>
            <button type="button" onClick={wallet.disconnect}>
              <Icon name="wallet" />
              <span>Disconnect</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">
            Choose your wallet to mint or claim on Ethereum.
          </p>
          <div className="wallet-rows">
            {mobile &&
              OPEN_IN.map((w) => (
                <a key={w.id} href={w.href(location.href)}>
                  <img
                    src={`./wallets/${w.id}.svg`}
                    width="28"
                    height="28"
                    alt=""
                  />
                  <span>Open in {w.name}</span>
                  <Icon name="external" size={16} />
                </a>
              ))}
            {wallet.wallets.map((w) => (
              <button
                key={w.info.uuid}
                type="button"
                disabled={!!wallet.connecting}
                onClick={() => void wallet.connect(w.info.rdns, w.provider)}
              >
                {w.info.icon.startsWith("data:image/") ? (
                  <img src={w.info.icon} alt="" width="28" height="28" />
                ) : (
                  <Icon name="wallet" size={28} />
                )}
                <span>
                  {w.info.name}
                  {wallet.connecting === w.info.rdns ? " · Opening…" : ""}
                </span>
              </button>
            ))}
            {!mobile && !wallet.wallets.length && (
              <button
                type="button"
                disabled={!!wallet.connecting}
                onClick={() => void wallet.connect("browser")}
              >
                <Icon name="wallet" size={28} />
                <span>
                  Browser wallet
                  {wallet.connecting === "browser" ? " · Opening…" : ""}
                </span>
              </button>
            )}
            <button
              type="button"
              disabled={!!wallet.connecting}
              onClick={() => void wallet.connect("coinbase")}
            >
              <img src="./wallets/coinbase.svg" alt="" width="28" height="28" />
              <span>
                {wallet.connecting === "coinbase"
                  ? "Opening Coinbase…"
                  : "Coinbase Smart Wallet"}
              </span>
            </button>
          </div>
          <p className="small muted wallet-note">
            Connecting only shares your address. Every transaction needs your
            confirmation in your wallet.
          </p>
        </>
      )}
      <p className="status-text error-text" role="status">
        {wallet.error}
      </p>
    </Modal>
  );
}
