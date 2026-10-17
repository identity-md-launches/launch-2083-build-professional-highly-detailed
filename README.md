# SeedClock

A static Ethereum mainnet dapp for SCLOCK, built with React, TypeScript, and Vite. The finished export is included in `dist/`.

## Install, preview, rebuild

Use Node 22.12+ and npm:

```sh
npm ci
npm run typecheck
npm run build
npm run preview
```

`npm run dev` starts development. Serve `dist/` over HTTPS on any static host. Vite uses `base: './'`, all assets are local and relative, and navigation uses hashes. No backend, credentials, relay, project ID, or server rewrites are needed. Use an HTTP preview rather than opening `index.html` with `file://`.

To update the share card, edit `assets/social-card.svg`, run `npm run render:social` with Chromium installed, and rebuild. The current PNG is already included. An absolute `og:image` URL can be configured once the final domain is known.

## Wallet behavior

EIP-6963 lists installed wallets by name, with `window.ethereum` as fallback. The same connect sheet offers mobile wallet-app links and a lazily loaded Coinbase Smart Wallet. There is no wagmi or RainbowKit runtime, and no automatic permission prompt.

Mint calls `mint(uint256)` with zero value after checking IMD, supply, lifetime allowance, account, chain, distributor configuration, and simulation. No approval is requested. Claim uses the distributor’s `claim()` for ETH and reads `claimable(address)`. ERC-20 claims are explained and linked to the contract. Addresses, RPC fallbacks, and ABIs are in `src/lib/contracts.ts`.

Pending actions prevent duplicate submission within the current page session. After reloading, check wallet activity before resubmitting. Failed chain reads show an explicit unavailable/retry state. Signing and live reads require a network connection; artwork and seed reproduction work offline.

## Validation

```sh
npm run validate:export
npx playwright install chromium webkit
npm run validate:browser
```

Actual worker results:

- Clean `npm ci`, typecheck, production build, and export checks passed. Main JavaScript is approximately 358 KB / 110 KB gzip.
- **17 browser interaction groups passed**, including mock-provider mint/claim, rejection, pending/confirmed/reverted states, network switching, keyboard focus, both themes, seven widths, 200% text enlargement, and offline use.
- The pinned taste@1 probe passed **16/16** checks. Both theme accessibility scans reported zero tested violations.
- Mainnet reads confirmed the supplied distributor configuration and treasury. All six previews match the deployed `tokenURI` SVGs byte for byte.
- Chromium ran. The supplied browser connector failed because of a read-only cache; direct Playwright worked. WebKit was attempted but lacks system libraries. Native wallet apps, passkey authorization, screen-reader sessions, and real transactions were not tested.

See [artifacts/validation.md](artifacts/validation.md) for commands, coverage, findings, evidence, and limitations. These are worker-side results, not independent certification. Dependencies and browsers were installed in `/tmp`; the identical source and lockfile were built there, with output written to this repository’s `dist/`. Optional `SEEDCLOCK_PLAYWRIGHT`, `SEEDCLOCK_AXE`, and `SEEDCLOCK_VIEM` variables let validation resolve external module entry files. Generated browser evidence goes in `test/scratch/validation/`.

## Source and maintenance

[DESIGN.md](DESIGN.md) documents the final design. Artwork comes from the [contract repository](https://github.com/identity-md-launches/launch-2079-seedclock) at commit `89b7f5edb83760e640e8d1d27f2509a1a0676f38`. Still variants remove only SMIL animation elements. The seed explorer implements the exact historical mapping; [Anthropic’s research](https://www.anthropic.com/research/ecdsa-curve-origins) is linked in the site. OpenSea is the requested, visibly labelled “coming soon” placeholder; replace it in `src/App.tsx` when the real collection URL is available.

Font, artwork, wallet-mark, and runtime-library licenses accompany their public assets. Design-guidance notices are in `LICENSES/Design-guidance.txt`.

The explicit `.gitignore` budget is **256 bytes**: dependency/cache exclusions at every depth (`**/node_modules/`, `**/.vite/`, `**/.cache/`, `**/*.tsbuildinfo`), `/test/scratch/`, and explicit inclusion of `/artifacts/` and its contents so validation evidence is retained. No source or `dist/` assets are excluded. No dependency directory, package cache, registry mirror, archive, or submodule is delivered. Uncompressed submission size is recorded in `artifacts/bundle-size.json` against the 8 MiB budget.
