import { useState } from "react";
import { deriveSeed, ORIGINS } from "../lib/seeds";
import { LINKS } from "../lib/contracts";
import { Icon } from "./Icon";

export function SeedExplorer() {
  const [input, setInput] = useState("3");
  const [seed, setSeed] = useState(() => deriveSeed(3));
  const [error, setError] = useState("");
  return (
    <div className="seed-explorer">
      <div className="explorer-intro">
        <Icon name="code" size={24} />
        <div>
          <h3>Trace a clock to its seed</h3>
          <p className="muted">
            Enter any token ID, including an unminted one.
          </p>
        </div>
      </div>
      <form
        className="seed-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            setSeed(deriveSeed(Number(input)));
            setError("");
          } catch {
            setError("Enter a whole token ID from 1 to 5,555.");
          }
        }}
        noValidate
      >
        <div>
          <label htmlFor="token-id">Token ID</label>
          <input
            id="token-id"
            name="tokenId"
            type="number"
            inputMode="numeric"
            min="1"
            max="5555"
            step="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "seed-error" : undefined}
          />
        </div>
        <button type="submit" className="button button-neutral">
          Reproduce seed <Icon name="arrow" size={18} />
        </button>
      </form>
      <p id="seed-error" className="error-text small" role="status">
        {error}
      </p>
      <div className="explorer-result" aria-live="polite" aria-atomic="true">
        <div className="seed-result-head">
          <strong>SeedClock #{seed.tokenId}</strong>
          <span>{seed.curve}</span>
        </div>
        <dl className="seed-metadata">
          <div>
            <dt>Origin · UTC</dt>
            <dd>
              {new Date(seed.timestamp * 1000)
                .toISOString()
                .replace("T", " ")
                .replace(".000Z", "")}
            </dd>
          </div>
          <div>
            <dt>Unix timestamp</dt>
            <dd className="mono">{seed.timestamp}</dd>
          </div>
          <div>
            <dt>Candidate index</dt>
            <dd className="mono">{seed.candidate.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>20-byte candidate seed</dt>
            <dd className="mono break-value">{seed.historicalSeed}</dd>
          </div>
          <div>
            <dt>Keccak-256 art seed</dt>
            <dd className="mono break-value">{seed.artSeed}</dd>
          </div>
        </dl>
      </div>
      <p className="small muted">
        Calculated locally from the published mapping. This does not check
        whether the token has been minted.
      </p>
      <a
        className="text-link"
        href={LINKS.reproduction}
        target="_blank"
        rel="noreferrer"
      >
        Open the reproduction code <Icon name="external" size={16} />
      </a>
    </div>
  );
}

export function OriginTable() {
  return (
    <div
      className="origin-table"
      role="region"
      aria-label="Historical seed origins"
    >
      <table>
        <caption>Five origins. Every clock follows the same recipe.</caption>
        <thead>
          <tr>
            <th scope="col">Curve</th>
            <th scope="col">Origin timestamp</th>
            <th scope="col">First candidate</th>
          </tr>
        </thead>
        <tbody>
          {ORIGINS.map((origin) => (
            <tr key={origin.curve}>
              <th scope="row">{origin.curve}</th>
              <td>
                <span className="mono">{origin.timestamp}</span>
                <span className="table-date">{origin.date}</span>
              </td>
              <td className="mono">
                {origin.candidate.toLocaleString("en-US")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
