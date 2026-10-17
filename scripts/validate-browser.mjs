import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Real browser tests of the production export. Mock providers are confined to this
// validation script; they never enter the site or submit a network transaction.
const { chromium, webkit } = await import(
  process.env.SEEDCLOCK_PLAYWRIGHT || "playwright"
);
const { default: AxeBuilder } = await import(
  process.env.SEEDCLOCK_AXE || "@axe-core/playwright"
);
const viem = await import(process.env.SEEDCLOCK_VIEM || "viem");
const { parseAbi, encodeFunctionData, encodeAbiParameters } = viem;
const dist = resolve("dist");
const output = resolve("test/scratch/validation");
await mkdir(output, { recursive: true });
const reports = [];
const checks = [];
function record(name) {
  checks.push(name);
  console.log(`PASS: ${name}`);
}
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith("/preview/")) throw Error("Use /preview/");
    const file = resolve(dist, path.slice("/preview/".length) || "index.html");
    if (!file.startsWith(dist + "/")) throw Error("Invalid path");
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const collection = "0x71a94bba25c46d3a8cb834549d5cb738637f046c";
const distributor = "0x147456d867937bba20f5bb4ee85b2e6d899e780e";
const imd = "0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7";
const walletAddress = "0x3d6a89c8751a45dd577a4c1f3b34e71c58236193";
const abi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function publicMinted(address) view returns (uint256)",
  "function royaltyConfiguration() view returns (address,address,uint96)",
  "function claimable(address) view returns (uint256)",
  "function mint(uint256)",
  "function claim()",
]);
const selector = (name) =>
  encodeFunctionData({
    abi,
    functionName: name,
    args:
      name === "mint"
        ? [1n]
        : ["balanceOf", "publicMinted", "claimable"].includes(name)
          ? [walletAddress]
          : undefined,
  }).slice(0, 10);
const uint = (value) =>
  encodeAbiParameters([{ type: "uint256" }], [BigInt(value)]);
const config = encodeAbiParameters(
  [{ type: "address" }, { type: "address" }, { type: "uint96" }],
  [distributor, distributor, 690n],
);

async function mockProvider(page, options = {}) {
  await page.addInitScript(
    ({
      selectors,
      config,
      uint55,
      uintIMD,
      uintMinted,
      uintClaim,
      address,
      imd,
      collection,
      options,
    }) => {
      const listeners = new Map();
      const state = (window.__walletTest = {
        address,
        chain: options.chain || "0x1",
        balance: uintIMD,
        minted: uintMinted,
        supply: uint55,
        claimable: uintClaim,
        config,
        requests: [],
        sent: [],
        rejectConnect: false,
        rejectSend: false,
        switchUnknown: false,
        receipt: null,
        accountChangeOnSimulate: false,
      });
      const provider = {
        on(event, cb) {
          const list = listeners.get(event) || [];
          list.push(cb);
          listeners.set(event, list);
        },
        removeListener(event, cb) {
          listeners.set(
            event,
            (listeners.get(event) || []).filter((x) => x !== cb),
          );
        },
        async request({ method, params }) {
          state.requests.push({ method, params });
          if (method === "eth_requestAccounts") {
            if (state.rejectConnect)
              throw { code: 4001, message: "User rejected" };
            return [state.address];
          }
          if (method === "eth_accounts") return [state.address];
          if (method === "eth_chainId") return state.chain;
          if (method === "wallet_switchEthereumChain") {
            if (state.switchUnknown) {
              state.switchUnknown = false;
              throw { code: 4902 };
            }
            state.chain = params[0].chainId;
            (listeners.get("chainChanged") || []).forEach((cb) =>
              cb(state.chain),
            );
            return null;
          }
          if (method === "wallet_addEthereumChain") return null;
          if (method === "eth_call") {
            const data = params[0].data.slice(0, 10);
            if (data === selectors.totalSupply) return state.supply;
            if (data === selectors.balanceOf)
              return params[0].to.toLowerCase() === imd
                ? state.balance
                : "0x" + "2".padStart(64, "0");
            if (data === selectors.publicMinted) return state.minted;
            if (data === selectors.claimable) return state.claimable;
            if (data === selectors.royaltyConfiguration) return state.config;
            if (data === selectors.mint || data === selectors.claim) {
              if (state.accountChangeOnSimulate) state.address = imd;
              return "0x";
            }
            throw Error("Unexpected contract read " + data);
          }
          if (method === "eth_sendTransaction") {
            if (state.rejectSend)
              throw { code: 4001, message: "User rejected" };
            state.sent.push(params[0]);
            return "0x" + String(state.sent.length).padStart(64, "0");
          }
          if (method === "eth_getTransactionReceipt") {
            if (state.receipt === null) return null;
            return {
              transactionHash: params[0],
              transactionIndex: "0x0",
              blockHash: "0x" + "9".repeat(64),
              blockNumber: "0x1",
              from: address,
              to: collection,
              cumulativeGasUsed: "0x5208",
              gasUsed: "0x5208",
              effectiveGasPrice: "0x3b9aca00",
              contractAddress: null,
              logs: [],
              logsBloom: "0x" + "0".repeat(512),
              status: state.receipt,
              type: "0x2",
            };
          }
          throw Error("Unexpected wallet method " + method);
        },
      };
      window.ethereum = provider;
      window.__emitWallet = (event, value) =>
        (listeners.get(event) || []).forEach((cb) => cb(value));
      const announce = () => {
        for (const [uuid, name, rdns] of [
          ["metamask-test", "MetaMask", "io.metamask"],
          ["rabby-test", "Rabby", "io.rabby"],
        ]) {
          window.dispatchEvent(
            new CustomEvent("eip6963:announceProvider", {
              detail: {
                provider,
                info: {
                  uuid,
                  name,
                  rdns,
                  icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"%3E%3Ccircle cx="14" cy="14" r="12" fill="%2380cbbb"/%3E%3C/svg%3E',
                },
              },
            }),
          );
        }
      };
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
    },
    {
      selectors: Object.fromEntries(
        [
          "totalSupply",
          "balanceOf",
          "publicMinted",
          "claimable",
          "royaltyConfiguration",
          "mint",
          "claim",
        ].map((name) => [name, selector(name)]),
      ),
      config,
      uint55: uint(55),
      uintIMD: uint(1250000000000000000n),
      uintMinted: uint(0),
      uintClaim: uint(12500000000000000n),
      address: walletAddress,
      imd,
      collection,
      options,
    },
  );
}

async function waitText(page, text) {
  await page
    .getByText(text, { exact: false })
    .first()
    .waitFor({ timeout: 12000 });
}
async function connect(page) {
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page.getByRole("button", { name: "MetaMask", exact: true }).click();
  await page
    .locator('[data-testid="imd-balance"]')
    .filter({ hasText: "1.25 IMD" })
    .waitFor();
}
async function refresh(page) {
  const button = page.getByRole("button", {
    name: "Refresh data",
    exact: true,
  });
  await button.waitFor();
  await button.click();
  await button.waitFor();
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  function observe(target) {
    target.on("pageerror", (error) => errors.push(error.message));
    target.on("response", (response) => {
      if (response.url().startsWith(url) && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
  }
  observe(page);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const primary = await page
    .getByRole("link", { name: "Mint SeedClock", exact: true })
    .boundingBox();
  assert.ok(primary && primary.y >= 0 && primary.y + primary.height < 844);
  assert.ok(
    await page
      .locator(".stage-main img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  record(
    "390px first screen shows the product, loaded artwork, and primary mint action",
  );

  for (const theme of ["dark", "light"]) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    for (const width of [320, 390, 640, 768, 900, 1150, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme}: horizontal overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    reports.push({ theme, violations: result.violations });
    assert.equal(
      result.violations.length,
      0,
      `${theme} axe violations: ${JSON.stringify(result.violations)}`,
    );
  }
  record(
    "Both themes: no horizontal overflow at seven widths; axe reports zero tested WCAG violations",
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "200% text enlargement overflows",
  );
  await page.screenshot({ path: resolve(output, "text-200.png") });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  record("200% text enlargement reflows at 390px without horizontal scroll");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    scrollTo(0, 0);
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
  );
  await page.reload();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
  );
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  record("Theme toggle works and persists across reload");

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "The story" })
    .click();
  assert.equal(new URL(page.url()).hash, "#story");
  await page.getByRole("link", { name: "Mint SeedClock", exact: true }).click();
  assert.equal(new URL(page.url()).hash, "#mint");
  record("Mobile navigation and mint anchor reach the intended sections");

  const mint = page.getByRole("button", {
    name: "Mint SeedClock",
    exact: true,
  });
  await mint.click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.activeElement).outlineWidth,
    ),
    "2px",
  );
  await page.screenshot({ path: resolve(output, "keyboard-focus.png") });
  assert.equal(
    await page.evaluate(
      () => document.activeElement?.closest("dialog") !== null,
    ),
    true,
  );
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.textContent?.includes("Mint SeedClock"),
    ),
    true,
  );
  await mint.click();
  await page
    .getByRole("button", { name: "Browser wallet", exact: true })
    .click();
  await waitText(page, "No browser wallet was found");
  await page.keyboard.press("Escape");
  record(
    "Wallet dialog traps native focus, closes with Escape, restores focus, and explains a missing wallet",
  );

  await page
    .getByRole("button", { name: "Inspect SeedClock #3 and its traits" })
    .click();
  await waitText(page, "0xc49d360886e704936a6678e1139d26b7819f7e90");
  await waitText(page, "Counterclockwise");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Explore more clocks", exact: true })
    .click();
  assert.equal(await page.locator(".preview-card").count(), 6);
  await page
    .getByRole("button", { name: "Show fewer clocks", exact: true })
    .click();
  assert.equal(await page.locator(".preview-card").count(), 3);
  assert.ok(
    await page
      .locator(".stage-main img")
      .getAttribute("src")
      .then((src) => src.includes("-still")),
  );
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  assert.ok(
    await page
      .locator(".stage-main img")
      .getAttribute("src")
      .then((src) => !src.includes("-still")),
  );
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  record(
    "Gallery details, deterministic token traits, expansion, pause control, and reduced-motion stills work",
  );

  await page.getByLabel("Token ID", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Reproduce seed", exact: true })
    .click();
  await waitText(page, "Enter a whole token ID");
  for (const [id, seed] of [
    [1, "3045ae6fc8422f64ed579528d38120eae12196d5"],
    [2, "bd71344799d5c7fcdc45b59fa3b9ab8f6a948bc5"],
    [3, "c49d360886e704936a6678e1139d26b7819f7e90"],
    [4, "a335926aa319a27a1d00896a6773a4827acdac73"],
    [5, "d09e8800291cb85396cc6717393284aaa0da64ba"],
  ]) {
    await page.getByLabel("Token ID", { exact: true }).fill(String(id));
    await page
      .getByRole("button", { name: "Reproduce seed", exact: true })
      .click();
    assert.ok(
      (await page.locator(".explorer-result").innerText()).includes(
        "0x" + seed,
      ),
    );
  }
  await page.getByLabel("Token ID", { exact: true }).fill("5555");
  await page
    .getByRole("button", { name: "Reproduce seed", exact: true })
    .click();
  assert.ok(
    (await page.locator(".explorer-result").innerText()).includes(
      "SeedClock #5555",
    ),
  );
  await page.getByText("Is the mint really free?", { exact: true }).click();
  assert.ok(
    (await page.locator("details").first().getAttribute("open")) !== null,
  );
  record(
    "Seed reproduction validates range and all five published NIST seed vectors; token 5555 and FAQ disclosure work",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: resolve(output, "desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, "mobile.png") });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.screenshot({ path: resolve(output, "mobile-light.png") });
  await context.close();

  const mockContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const mock = await mockContext.newPage();
  observe(mock);
  await mockProvider(mock);
  await mock.goto(url);
  assert.equal(
    await mock.evaluate(
      () =>
        window.__walletTest.requests.filter(
          (r) => r.method === "eth_requestAccounts",
        ).length,
    ),
    0,
  );
  await mock
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  assert.equal(
    await mock.getByRole("button", { name: "Rabby", exact: true }).count(),
    1,
  );
  assert.equal(
    await mock
      .getByRole("button", { name: "Browser wallet", exact: true })
      .count(),
    0,
  );
  await mock.evaluate(() => {
    window.__walletTest.rejectConnect = true;
  });
  await mock.getByRole("button", { name: "MetaMask", exact: true }).click();
  await waitText(mock, "Request declined");
  await mock.evaluate(() => {
    window.__walletTest.rejectConnect = false;
  });
  await mock.getByRole("button", { name: "MetaMask", exact: true }).click();
  await waitText(mock, "1.25 IMD");
  assert.equal(
    await mock.locator('[data-testid="claimable"]').innerText(),
    "0.0125 ETH",
  );
  record(
    "EIP-6963 names both wallets, suppresses generic fallback, connects only on request, and recovers from rejection",
  );

  for (let i = 0; i < 4; i++)
    await mock.getByRole("button", { name: "Increase mint quantity" }).click();
  assert.equal(await mock.locator("#mint-quantity").innerText(), "5");
  assert.ok(
    await mock
      .getByRole("button", { name: "Increase mint quantity" })
      .isDisabled(),
  );
  await mock
    .getByRole("button", { name: "Mint SeedClock", exact: true })
    .click();
  await waitText(mock, "Transaction submitted");
  assert.ok(
    (await mock
      .getByRole("button", { name: "Claim pending…", exact: true })
      .count()) === 0,
  );
  assert.ok(
    await mock
      .getByRole("button", { name: "Claim royalties", exact: true })
      .isDisabled(),
  );
  const sent = await mock.evaluate(() => window.__walletTest.sent);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, collection);
  assert.equal(sent[0].value, "0x0");
  assert.equal(
    sent[0].data,
    encodeFunctionData({ abi, functionName: "mint", args: [5n] }),
  );
  assert.equal(
    await mock.evaluate(
      () =>
        window.__walletTest.requests.filter((r) =>
          /approve|personal_sign|eth_sign/.test(r.method),
        ).length,
    ),
    0,
  );
  await mock.evaluate(
    ({ used, supply }) => {
      window.__walletTest.receipt = "0x1";
      window.__walletTest.minted = used;
      window.__walletTest.supply = supply;
    },
    { used: uint(5), supply: uint(60) },
  );
  await mock
    .getByRole("button", { name: "Check confirmation", exact: true })
    .click();
  await waitText(mock, "Your SeedClock mint is confirmed");
  await waitText(mock, "5 of 5");
  assert.ok(
    await mock
      .getByRole("button", { name: "Mint SeedClock", exact: true })
      .isDisabled(),
  );
  record(
    "Quantity 1–5, exact mint(uint256) calldata, zero value, no approvals, pending lock, confirmation, and lifetime cap work",
  );

  await mock.evaluate(() => {
    window.__walletTest.receipt = null;
  });
  await mock
    .getByRole("button", { name: "Claim royalties", exact: true })
    .click();
  await waitText(mock, "Transaction submitted");
  const claims = await mock.evaluate(() => window.__walletTest.sent);
  assert.equal(claims.length, 2);
  assert.equal(claims[1].to, distributor);
  assert.equal(claims[1].data, selector("claim"));
  assert.equal(claims[1].value, "0x0");
  await mock.evaluate(
    ({ zero }) => {
      window.__walletTest.receipt = "0x1";
      window.__walletTest.claimable = zero;
    },
    { zero: uint(0) },
  );
  await mock
    .getByRole("button", { name: "Check confirmation", exact: true })
    .click();
  await waitText(mock, "Royalties claimed.");
  await waitText(mock, "No ETH is claimable yet");
  assert.ok(
    await mock
      .getByRole("button", { name: "Claim royalties", exact: true })
      .isDisabled(),
  );
  record(
    "Exact claim() call goes to the distributor; confirmation refreshes the ETH balance and empty state",
  );

  await mock.evaluate(
    ({ zero, balance }) => {
      window.__walletTest.minted = zero;
      window.__walletTest.balance = balance;
    },
    { zero: uint(0), balance: uint(0) },
  );
  await refresh(mock);
  await waitText(mock, "You need at least 1 IMD");
  assert.ok(
    await mock
      .getByRole("button", { name: "Mint SeedClock", exact: true })
      .isDisabled(),
  );
  await mock.evaluate(
    ({ balance }) => {
      window.__walletTest.balance = balance;
      window.__walletTest.rejectSend = true;
    },
    { balance: uint(10n ** 18n) },
  );
  await refresh(mock);
  await mock
    .getByRole("button", { name: "Mint SeedClock", exact: true })
    .click();
  await waitText(mock, "Request declined");
  assert.ok(
    await mock
      .getByRole("button", { name: "Mint SeedClock", exact: true })
      .isEnabled(),
  );
  await mock.evaluate(() => {
    window.__walletTest.rejectSend = false;
    window.__walletTest.receipt = "0x0";
  });
  await mock
    .getByRole("button", { name: "Mint SeedClock", exact: true })
    .click();
  await waitText(mock, "Transaction submitted");
  await mock
    .getByRole("button", { name: "Check confirmation", exact: true })
    .click();
  await waitText(mock, "The transaction reverted on Ethereum");
  record(
    "Insufficient IMD, rejected signature, retry, and mined transaction failure produce recoverable states",
  );

  await mock.evaluate(() => {
    window.__walletTest.accountChangeOnSimulate = true;
  });
  const count = await mock.evaluate(() => window.__walletTest.sent.length);
  await mock
    .getByRole("button", { name: "Mint SeedClock", exact: true })
    .click();
  await waitText(mock, "Your account changed");
  assert.equal(
    await mock.evaluate(() => window.__walletTest.sent.length),
    count,
  );
  record("An account change during simulation blocks submission");
  await mockContext.close();

  const wrongContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const wrong = await wrongContext.newPage();
  observe(wrong);
  await mockProvider(wrong, { chain: "0x89" });
  await wrong.goto(url);
  await wrong
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await wrong.getByRole("button", { name: "MetaMask", exact: true }).click();
  await wrong
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .first()
    .waitFor();
  assert.ok(
    await wrong.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Wrong-network header overflows mobile",
  );
  await wrong.evaluate(() => {
    window.__walletTest.switchUnknown = true;
  });
  await wrong
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .first()
    .click();
  await waitText(wrong, "1.25 IMD");
  const added = await wrong.evaluate(() =>
    window.__walletTest.requests.find(
      (r) => r.method === "wallet_addEthereumChain",
    ),
  );
  assert.equal(added.params[0].chainId, "0x1");
  assert.equal(added.params[0].nativeCurrency.symbol, "ETH");
  assert.equal(await wrong.evaluate(() => window.__walletTest.sent.length), 0);
  await wrong.reload();
  await wrong
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .first()
    .waitFor();
  assert.equal(
    await wrong.evaluate(
      () =>
        window.__walletTest.requests.filter(
          (r) => r.method === "eth_requestAccounts",
        ).length,
    ),
    0,
  );
  await wrong
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .first()
    .click();
  await waitText(wrong, "1.25 IMD");
  await wrong.locator(".button-wallet").click();
  await wrong.getByRole("button", { name: "Disconnect", exact: true }).click();
  assert.equal(
    await wrong
      .getByRole("button", { name: "Connect wallet", exact: true })
      .count(),
    1,
  );
  record(
    "Wrong-network switch/add-chain fallback, passive reconnect, and local disconnect work without submitting a transaction",
  );
  await wrongContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(url);
  await mobile
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"]) {
    const href = await mobile
      .getByRole("link", { name: `Open in ${name}`, exact: true })
      .getAttribute("href");
    assert.ok(href && href.startsWith("https://"));
    assert.ok(href.includes(encodeURIComponent(url)) || name === "MetaMask");
  }
  assert.equal(
    await mobile
      .getByRole("button", { name: "Browser wallet", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await mobile
      .getByRole("button", { name: "Coinbase Smart Wallet", exact: true })
      .count(),
    1,
  );
  await mobile.screenshot({ path: resolve(output, "mobile-wallet.png") });
  await mobileContext.close();
  record(
    "Phone sheet offers four encoded wallet-app links and Coinbase Smart Wallet without a relay or project ID",
  );

  const offlineContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await offlineContext.route("https://**/*", (route) => route.abort());
  const offline = await offlineContext.newPage();
  observe(offline);
  await offline.goto(url);
  await waitText(offline, "Live supply is unavailable");
  assert.equal(
    await offline.locator('[data-testid="supply"]').innerText(),
    "Unavailable",
  );
  await offline
    .getByRole("button", { name: "Refresh data", exact: true })
    .click();
  await waitText(offline, "Live supply is unavailable");
  await offline
    .getByRole("button", { name: "Mint SeedClock", exact: true })
    .click();
  await offline.getByRole("dialog").waitFor();
  await offline.keyboard.press("Escape");
  await offline.getByLabel("Token ID", { exact: true }).fill("3");
  await offline
    .getByRole("button", { name: "Reproduce seed", exact: true })
    .click();
  assert.ok(
    (await offline.locator(".explorer-result").innerText()).includes(
      "0xc49d360886e704936a6678e1139d26b7819f7e90",
    ),
  );
  await offlineContext.close();
  record(
    "With external network blocked, local art, seed reproduction, wallet entry, unavailable supply, and retry remain usable",
  );

  assert.deepEqual(errors, []);
  record(
    "No application exceptions or missing local resources in the production export",
  );
  try {
    const safari = await webkit.launch({ headless: true });
    const p = await safari.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(url);
    await p.getByRole("link", { name: "Mint SeedClock", exact: true }).click();
    await p
      .getByRole("button", { name: "Mint SeedClock", exact: true })
      .click();
    await p.getByRole("dialog").waitFor();
    await p.keyboard.press("Escape");
    await safari.close();
    record("WebKit mint entry and wallet dialog work");
  } catch (e) {
    reports.push({
      limitation: "WebKit unavailable on this worker",
      reason: e.message.slice(0, 1800),
    });
    console.log(
      "LIMITATION: WebKit host libraries unavailable; see results.json",
    );
  }
  await writeFile(
    resolve(output, "results.json"),
    JSON.stringify(
      { date: new Date().toISOString(), checks, reports, errors },
      null,
      2,
    ),
  );
  console.log(
    `${checks.length} interaction groups passed. Evidence: ${pathToFileURL(output)}`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
