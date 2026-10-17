import { useEffect, useState } from "react";
import { formatEther, formatUnits } from "viem";
import { etherscanTx, IMD_THRESHOLD, TOTAL_SUPPLY } from "../lib/contracts";
import type { CollectionState } from "../lib/useCollection";
import type { WalletState } from "../lib/wallet";
import { Icon } from "./Icon";

function formatIMD(value: bigint) {
  const [whole, decimal] = formatUnits(value, 18).split(".");
  return `${BigInt(whole).toLocaleString("en-US")}${decimal ? `.${decimal.slice(0, 4)}` : ""}`;
}

export function MintClaim({
  wallet,
  collection,
}: {
  wallet: WalletState;
  collection: CollectionState;
}) {
  const [quantity, setQuantity] = useState(1);
  const remaining =
    collection.minted === null ? 5 : Math.max(0, 5 - Number(collection.minted));
  const supplyRemaining =
    collection.supply === null
      ? 5
      : Math.max(0, Number(TOTAL_SUPPLY - collection.supply));
  const max = Math.min(5, remaining, supplyRemaining);
  useEffect(() => {
    if (quantity > max && max > 0) setQuantity(max);
  }, [max, quantity]);
  const connected = !!wallet.address;
  const wrongNetwork = connected && wallet.chainId !== 1;
  const eligible =
    collection.balance === null || collection.balance >= IMD_THRESHOLD;
  const mintUnavailable =
    collection.pending ||
    (connected && !wrongNetwork && (max === 0 || !eligible));
  const claimUnavailable =
    collection.pending ||
    (connected && !wrongNetwork && collection.claimable === 0n);
  const supplyText =
    collection.supply === null
      ? collection.loading
        ? "Loading…"
        : "Unavailable"
      : `${collection.supply.toLocaleString("en-US")} / 5,555`;
  const progress =
    collection.supply === null
      ? null
      : (Number(collection.supply) / 5555) * 100;
  const tx = collection.tx;
  return (
    <section
      id="mint"
      className="section mint-section"
      aria-labelledby="mint-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="mint-title">Make time your own.</h2>
          <p>Hold at least 1 IMD. Mint a clock. Share in its future.</p>
        </div>
        <span className="network-label">
          <span className="status-dot" /> Ethereum mainnet
        </span>
      </div>
      <ol className="mint-steps">
        <li>
          <span>1</span>Hold at least 1 IMD
        </li>
        <li>
          <span>2</span>Connect your wallet
        </li>
        <li>
          <span>3</span>Mint up to 5 clocks
        </li>
        <li>
          <span>4</span>Claim royalties anytime
        </li>
      </ol>
      <div className="action-grid">
        <div className="mint-panel">
          <div className="panel-heading">
            <Icon name="clock" size={26} />
            <h3>Mint your SeedClock</h3>
            <span className="small muted">Free + gas</span>
          </div>
          <div className="supply-row">
            <span>Minted supply</span>
            <strong className="numeric" data-testid="supply">
              {supplyText}
            </strong>
          </div>
          <div
            className={`supply-track ${progress === null ? "supply-unknown" : ""}`}
            role={progress === null ? undefined : "progressbar"}
            aria-label="Collection minted"
            aria-valuenow={
              collection.supply === null ? undefined : Number(collection.supply)
            }
            aria-valuemin={0}
            aria-valuemax={5555}
          >
            <span style={{ width: `${progress ?? 0}%` }} />
          </div>
          <dl className="mint-data">
            <div>
              <dt>Your IMD balance</dt>
              <dd data-testid="imd-balance">
                {!connected
                  ? "Connect to view"
                  : wrongNetwork
                    ? "Switch network"
                    : collection.balance === null
                      ? collection.loading
                        ? "Checking…"
                        : "Unavailable"
                      : `${formatIMD(collection.balance)} IMD`}
              </dd>
            </div>
            <div>
              <dt>Lifetime mints used</dt>
              <dd>
                {!connected
                  ? "0–5 per wallet"
                  : collection.minted === null
                    ? "Not loaded"
                    : `${collection.minted} of 5`}
              </dd>
            </div>
          </dl>
          <div className="quantity-row">
            <div>
              <label htmlFor="mint-quantity">Quantity</label>
              <span className="small muted">
                {connected && max === 0
                  ? "Allowance or supply exhausted"
                  : "Up to 5 per wallet, lifetime"}
              </span>
            </div>
            <div className="quantity-control">
              <button
                type="button"
                className="icon-button"
                disabled={quantity <= 1 || collection.pending}
                aria-label="Decrease mint quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Icon name="minus" size={18} />
              </button>
              <output
                id="mint-quantity"
                aria-live="polite"
                aria-label="Mint quantity"
              >
                {quantity}
              </output>
              <button
                type="button"
                className="icon-button"
                disabled={quantity >= max || collection.pending}
                aria-label="Increase mint quantity"
                onClick={() => setQuantity((q) => Math.min(max, q + 1))}
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          </div>
          <div className="mint-price">
            <span>Total mint price</span>
            <strong>
              0 ETH <span className="small muted">+ network gas</span>
            </strong>
          </div>
          <button
            type="button"
            className="button button-primary button-full"
            disabled={mintUnavailable}
            onClick={() => void collection.transact("mint", quantity)}
          >
            {collection.pending && tx.kind === "mint" ? (
              <>
                <span className="spinner" />
                {tx.phase === "checking"
                  ? "Checking IMD…"
                  : tx.phase === "signing"
                    ? "Confirm in wallet…"
                    : "Mint pending…"}
              </>
            ) : (
              <>
                {wrongNetwork ? "Switch to Ethereum" : "Mint SeedClock"}
                <Icon name="arrow" />
              </>
            )}
          </button>
          <p
            className={`small mint-help ${!eligible ? "error-text" : "muted"}`}
          >
            {!connected
              ? "Connect a wallet to check eligibility and mint."
              : wrongNetwork
                ? "Minting is available on Ethereum mainnet."
                : !eligible
                  ? "You need at least 1 IMD in this wallet to mint."
                  : max === 0
                    ? "Your five-clock allowance is used, or the collection is sold out."
                    : "Your IMD stays in your wallet. No approval needed."}
          </p>
        </div>
        <div id="claim" className="claim-panel">
          <div className="panel-heading">
            <Icon name="spark" size={26} />
            <h3>Royalties for your time</h3>
          </div>
          <p className="muted">
            A 6.9% royalty on supported secondary sales flows to the distributor
            for SeedClock holders.
          </p>
          <div className="claim-balance">
            <span className="small muted">Available ETH royalties</span>
            <strong data-testid="claimable">
              {!connected ? (
                <>
                  <span className="muted">Connect to view</span>
                </>
              ) : wrongNetwork ? (
                <span className="muted">Switch network</span>
              ) : collection.claimable === null ? (
                <span className="muted">
                  {collection.loading ? "Checking…" : "Unavailable"}
                </span>
              ) : (
                <>
                  {formatEther(collection.claimable)} <span>ETH</span>
                </>
              )}
            </strong>
          </div>
          <div className="royalty-explanation">
            <Icon name="shield" size={20} />
            <p>
              Royalties accrue to holders when receipts are recorded. Earned
              claims stay with you even if you later transfer your clock.
            </p>
          </div>
          <button
            type="button"
            className="button button-neutral button-full"
            disabled={claimUnavailable}
            onClick={() => void collection.transact("claim")}
          >
            {collection.pending && tx.kind === "claim" ? (
              <>
                <span className="spinner" />
                {tx.phase === "checking"
                  ? "Checking royalties…"
                  : tx.phase === "signing"
                    ? "Confirm claim…"
                    : "Claim pending…"}
              </>
            ) : (
              <>
                {wrongNetwork ? "Switch to Ethereum" : "Claim royalties"}
                <Icon name="arrow" />
              </>
            )}
          </button>
          <p className="small muted">
            {connected && collection.claimable === 0n
              ? "No ETH is claimable yet. Future receipts may add royalties."
              : "Claim ETH directly to your connected wallet. Gas applies."}
          </p>
          <a href="#royalty-details" className="text-link small">
            How royalty claims work <Icon name="chevron" size={16} />
          </a>
        </div>
      </div>
      <div className="collection-status">
        <p className="small muted">
          {collection.readError ||
            (collection.loading
              ? "Reading collection data from Ethereum…"
              : "Amounts are read from Ethereum. Eligibility is checked again before a transaction.")}
        </p>
        <button
          type="button"
          className="text-button small"
          disabled={collection.loading}
          onClick={() => void collection.refresh()}
        >
          <Icon name="refresh" size={16} />
          {collection.loading ? "Refreshing…" : "Refresh data"}
        </button>
      </div>
      {wallet.error && !wallet.open && (
        <p className="error-text" role="status">
          {wallet.error}
        </p>
      )}
      <div
        className={`transaction-status ${tx.phase !== "idle" ? "has-status" : ""} ${tx.phase === "error" ? "is-error" : ""} ${tx.phase === "success" ? "is-success" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {tx.phase !== "idle" && (
          <>
            <div className="transaction-message">
              <Icon
                name={
                  tx.phase === "success"
                    ? "check"
                    : tx.phase === "error"
                      ? "close"
                      : "clock"
                }
              />
              <p>{tx.message}</p>
            </div>
            {tx.hash && (
              <div className="transaction-links">
                <a
                  href={etherscanTx(tx.hash)}
                  className="text-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction <Icon name="external" size={16} />
                </a>
                {tx.phase === "pending" && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={collection.checkingReceipt}
                    onClick={() => void collection.checkReceipt()}
                  >
                    {collection.checkingReceipt
                      ? "Checking…"
                      : "Check confirmation"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
