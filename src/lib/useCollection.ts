import { useCallback, useEffect, useRef, useState } from "react";
import { encodeFunctionData, type Hex } from "viem";
import { getTransactionReceipt, readContract } from "viem/actions";
import { assertSession, type WalletState } from "./wallet";
import {
  clientFor,
  CONTRACTS,
  distributorAbi,
  friendlyError,
  imdAbi,
  IMD_THRESHOLD,
  seedclockAbi,
  TOTAL_SUPPLY,
} from "./contracts";

export type TransactionState = {
  phase: "idle" | "checking" | "signing" | "pending" | "success" | "error";
  kind?: "mint" | "claim";
  message: string;
  hash?: Hex;
};

export function useCollection(wallet: WalletState) {
  const [supply, setSupply] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [minted, setMinted] = useState<bigint | null>(null);
  const [claimable, setClaimable] = useState<bigint | null>(null);
  const [owned, setOwned] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [tx, setTx] = useState<TransactionState>({
    phase: "idle",
    message: "",
  });
  const [checkingReceipt, setCheckingReceipt] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const session = useRef(wallet);
  session.current = wallet;

  const refresh = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true);
    setReadError("");
    const onMainnet = wallet.chainId === 1;
    const client = clientFor(onMainnet ? wallet.provider : null);
    const supplyRead = readContract(client, {
      address: CONTRACTS.seedclock,
      abi: seedclockAbi,
      functionName: "totalSupply",
    });
    if (!wallet.address || !onMainnet) {
      setBalance(null);
      setMinted(null);
      setClaimable(null);
      setOwned(null);
      try {
        const total = await supplyRead;
        if (run === generation.current) setSupply(total);
      } catch {
        if (run === generation.current) {
          setSupply(null);
          setReadError(
            "Live supply is unavailable. Retry or connect a wallet on Ethereum.",
          );
        }
      } finally {
        if (run === generation.current) setLoading(false);
      }
      return;
    }
    const address = wallet.address;
    const results = await Promise.allSettled([
      supplyRead,
      readContract(client, {
        address: CONTRACTS.imd,
        abi: imdAbi,
        functionName: "balanceOf",
        args: [address],
      }),
      readContract(client, {
        address: CONTRACTS.seedclock,
        abi: seedclockAbi,
        functionName: "publicMinted",
        args: [address],
      }),
      readContract(client, {
        address: CONTRACTS.distributor,
        abi: distributorAbi,
        functionName: "claimable",
        args: [address],
      }),
      readContract(client, {
        address: CONTRACTS.seedclock,
        abi: seedclockAbi,
        functionName: "balanceOf",
        args: [address],
      }),
    ]);
    if (run !== generation.current) return;
    const value = (i: number) =>
      results[i].status === "fulfilled"
        ? (results[i] as PromiseFulfilledResult<bigint>).value
        : null;
    setSupply(value(0));
    setBalance(value(1));
    setMinted(value(2));
    setClaimable(value(3));
    setOwned(value(4));
    if (results.some((r) => r.status === "rejected"))
      setReadError(
        "Some wallet data could not load. Refresh to try again; no transaction has been sent.",
      );
    setLoading(false);
  }, [wallet.address, wallet.chainId, wallet.provider]);

  useEffect(() => {
    setBalance(null);
    setMinted(null);
    setClaimable(null);
    setOwned(null);
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);

  const checkReceipt = useCallback(async () => {
    if (!tx.hash || tx.phase !== "pending") return;
    setCheckingReceipt(true);
    try {
      const current = session.current;
      const receipt = await getTransactionReceipt(
        clientFor(current.chainId === 1 ? current.provider : null),
        { hash: tx.hash },
      );
      if (receipt.status === "success") {
        setTx((old) => ({
          ...old,
          phase: "success",
          message:
            old.kind === "mint"
              ? "Your SeedClock mint is confirmed on Ethereum. Your clocks are in the wallet that minted them."
              : "Royalties claimed. The confirmed ETH payment was sent to your wallet.",
        }));
        void refresh();
      } else
        setTx((old) => ({
          ...old,
          phase: "error",
          message:
            "The transaction reverted on Ethereum. No mint or claim completed. Refresh your data before trying again.",
        }));
    } catch {
      /* Pending or RPC unavailable: the transaction link remains the source of truth. */
    } finally {
      setCheckingReceipt(false);
    }
  }, [tx.hash, tx.phase, refresh]);

  useEffect(() => {
    if (tx.phase !== "pending") return;
    const timer = window.setTimeout(() => void checkReceipt(), 4000);
    return () => clearTimeout(timer);
  }, [tx.phase, checkReceipt, checkingReceipt]);

  async function transact(kind: "mint" | "claim", quantity = 1) {
    if (busy.current || ["checking", "signing", "pending"].includes(tx.phase))
      return;
    if (!wallet.address || !wallet.provider) {
      wallet.setError("");
      wallet.setOpen(true);
      return;
    }
    if (wallet.chainId !== 1) {
      void wallet.switchNetwork();
      return;
    }
    busy.current = true;
    const account = wallet.address;
    const provider = wallet.provider;
    setTx({
      phase: "checking",
      kind,
      message:
        kind === "mint"
          ? "Checking your IMD balance, mint allowance, and supply…"
          : "Checking your pending ETH royalties…",
    });
    try {
      await assertSession(provider, account);
      const client = clientFor(provider);
      const config = await readContract(client, {
        address: CONTRACTS.seedclock,
        abi: seedclockAbi,
        functionName: "royaltyConfiguration",
      });
      if (
        config[0].toLowerCase() !== CONTRACTS.distributor ||
        config[1].toLowerCase() !== CONTRACTS.distributor ||
        config[2] !== 690n
      )
        throw new Error(
          "Contract configuration could not be verified. No transaction was sent.",
        );
      if (kind === "mint") {
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5)
          throw new Error("Choose between 1 and 5 clocks.");
        const [imd, used, total] = await Promise.all([
          readContract(client, {
            address: CONTRACTS.imd,
            abi: imdAbi,
            functionName: "balanceOf",
            args: [account],
          }),
          readContract(client, {
            address: CONTRACTS.seedclock,
            abi: seedclockAbi,
            functionName: "publicMinted",
            args: [account],
          }),
          readContract(client, {
            address: CONTRACTS.seedclock,
            abi: seedclockAbi,
            functionName: "totalSupply",
          }),
        ]);
        if (imd < IMD_THRESHOLD) throw new Error("IMDRequired");
        if (used + BigInt(quantity) > 5n) throw new Error("WalletLimit");
        if (total + BigInt(quantity) > TOTAL_SUPPLY) throw new Error("SoldOut");
      } else {
        const amount = await readContract(client, {
          address: CONTRACTS.distributor,
          abi: distributorAbi,
          functionName: "claimable",
          args: [account],
        });
        if (amount === 0n) throw new Error("NothingToClaim");
      }
      const to = kind === "mint" ? CONTRACTS.seedclock : CONTRACTS.distributor;
      const data =
        kind === "mint"
          ? encodeFunctionData({
              abi: seedclockAbi,
              functionName: "mint",
              args: [BigInt(quantity)],
            })
          : encodeFunctionData({ abi: distributorAbi, functionName: "claim" });
      const transaction = { from: account, to, data, value: "0x0" };
      await provider.request({
        method: "eth_call",
        params: [transaction, "latest"],
      });
      await assertSession(provider, account);
      setTx({
        phase: "signing",
        kind,
        message:
          kind === "mint"
            ? `Confirm the free mint of ${quantity} ${quantity === 1 ? "clock" : "clocks"} in your wallet. Only network gas is charged.`
            : "Confirm the ETH royalty claim in your wallet. Network gas applies.",
      });
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [transaction],
      });
      if (typeof hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(hash))
        throw new Error(
          "The wallet did not return a valid transaction hash. Check your wallet activity before trying again.",
        );
      setTx({
        phase: "pending",
        kind,
        hash: hash as Hex,
        message:
          "Transaction submitted. Waiting for confirmation on Ethereum. You can follow its progress on Etherscan.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const known =
        /Choose between|configuration could|account changed|valid transaction hash/.test(
          message,
        );
      setTx({
        phase: "error",
        kind,
        message: known ? message : friendlyError(e),
      });
    } finally {
      busy.current = false;
    }
  }

  return {
    supply,
    balance,
    minted,
    claimable,
    owned,
    loading,
    readError,
    tx,
    checkingReceipt,
    refresh,
    checkReceipt,
    transact,
    pending: ["checking", "signing", "pending"].includes(tx.phase),
  };
}

export type CollectionState = ReturnType<typeof useCollection>;
