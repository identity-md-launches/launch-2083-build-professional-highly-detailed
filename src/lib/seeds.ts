import { encodePacked, keccak256, type Hex } from "viem";

// Exact mapping from SeedData.sol, pinned upstream commit 89b7f5e.
export const ORIGINS = [
  {
    curve: "P-192",
    timestamp: 863966734,
    candidate: 139,
    date: "May 18, 1997",
  },
  {
    curve: "P-224",
    timestamp: 891607927,
    candidate: 7026,
    date: "April 3, 1998",
  },
  {
    curve: "P-256",
    timestamp: 871696354,
    candidate: 1842,
    date: "August 16, 1997",
  },
  {
    curve: "P-384",
    timestamp: 872952608,
    candidate: 2688,
    date: "August 30, 1997",
  },
  {
    curve: "P-521",
    timestamp: 871002724,
    candidate: 1136,
    date: "August 8, 1997",
  },
] as const;

export function deriveSeed(tokenId: number) {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 5555)
    throw new RangeError("Choose a token ID from 1 to 5,555.");
  const origin = ORIGINS[(tokenId - 1) % 5];
  const candidate = origin.candidate + Math.floor((tokenId - 1) / 5);
  let state = (BigInt(origin.timestamp) << 16n) | 0x330en;
  const mask = (1n << 48n) - 1n;
  let seed = "0x";
  for (let step = 0; step < 20 * candidate; step++) {
    state = (0x5deece66dn * state + 11n) & mask;
    if (step >= 20 * (candidate - 1))
      seed += (state >> 40n).toString(16).padStart(2, "0");
  }
  const historicalSeed = seed as Hex;
  const artSeed = keccak256(
    encodePacked(
      ["string", "bytes20", "uint256"],
      ["SeedClock/v1", historicalSeed, BigInt(tokenId)],
    ),
  );
  const n = BigInt(artSeed);
  const byte = (i: number) => Number((n >> BigInt(i * 8)) & 255n);
  const traits = {
    Background: [
      "Midnight",
      "Parchment",
      "CRT Mint",
      "Oxide",
      "Violet Terminal",
      "Cobalt",
    ][byte(0) % 6],
    Body: ["Cassette", "Floppy", "Mainframe", "Circuit", "Crystal"][
      byte(1) % 5
    ],
    Accessory: [
      "Antenna",
      "Orbit",
      "Sprout",
      "Lightning",
      "Ribbon",
      "Data Tabs",
    ][byte(2) % 6],
    Face: ["Round", "Square", "Octagon", "Radar", "Split"][byte(3) % 5],
    Glasses: ["Block", "Visor", "Monocle", "Wireframe", "Pixel Eyes"][
      byte(4) % 5
    ],
    Tempo: `${[12, 20, 32, 48][byte(5) % 4]} seconds`,
    Direction: byte(6) % 2 ? "Counterclockwise" : "Clockwise",
  };
  return { tokenId, ...origin, candidate, historicalSeed, artSeed, traits };
}

export const PREVIEW_IDS = [3, 1, 4, 6, 13, 25] as const;
export const PREVIEWS = PREVIEW_IDS.map(deriveSeed);
