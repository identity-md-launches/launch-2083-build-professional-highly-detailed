import type { PREVIEWS } from "../lib/seeds";
import { deriveSeed } from "../lib/seeds";
import { CONTRACTS, LINKS } from "../lib/contracts";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export function Artwork({
  id,
  paused,
  className = "",
  priority = false,
  decorative = false,
}: {
  id: number;
  paused: boolean;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <img
      className={`artwork ${className}`}
      src={`./art/seedclock-${id}${paused ? "-still" : ""}.svg`}
      alt={
        decorative
          ? ""
          : `SeedClock #${id}, a generative clock with layered body, face, and glasses`
      }
      width="480"
      height="480"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

export function ArtDetail({
  id,
  paused,
  onClose,
}: {
  id: number;
  paused: boolean;
  onClose: () => void;
}) {
  const seed = deriveSeed(id);
  return (
    <Modal title={`SeedClock #${id}`} onClose={onClose} wide>
      <div className="art-detail">
        <div>
          <Artwork id={id} paused={paused} priority />
          <p className="small muted">
            Static preview from the collection’s Solidity renderer. Animation is
            part of the SVG.
          </p>
          <a
            className="text-link"
            href={`./art/seedclock-${id}.svg`}
            target="_blank"
            rel="noreferrer"
          >
            Open original SVG <Icon name="external" size={16} />
          </a>
        </div>
        <div>
          <h3>A reproducible moment</h3>
          <p className="muted">
            {seed.curve}, seeded on {seed.date}. Every trait below is derived
            from this token’s art seed.
          </p>
          <dl className="traits-list">
            {Object.entries(seed.traits).map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="seed-metadata">
            <div>
              <dt>Unix timestamp</dt>
              <dd className="mono">{seed.timestamp}</dd>
            </div>
            <div>
              <dt>Candidate index</dt>
              <dd className="mono">{seed.candidate.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Candidate seed</dt>
              <dd className="mono break-value">{seed.historicalSeed}</dd>
            </div>
          </dl>
          <a
            className="text-link"
            href={`${LINKS.github}/blob/main/src/art/SeedArt.sol`}
            target="_blank"
            rel="noreferrer"
          >
            Inspect the renderer <Icon name="external" size={16} />
          </a>
          <a
            className="text-link detail-explorer"
            href={`https://etherscan.io/token/${CONTRACTS.seedclock}?a=${id}`}
            target="_blank"
            rel="noreferrer"
          >
            View token on Etherscan <Icon name="external" size={16} />
          </a>
        </div>
      </div>
    </Modal>
  );
}

export function PreviewCard({
  preview,
  paused,
  onSelect,
}: {
  preview: (typeof PREVIEWS)[number];
  paused: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      type="button"
      className="preview-card"
      onClick={() => onSelect(preview.tokenId)}
      aria-label={`Inspect SeedClock #${preview.tokenId} and its traits`}
    >
      <div className="preview-image">
        <Artwork id={preview.tokenId} paused={paused} />
        <span className="art-inspect">
          <Icon name="plus" size={20} />
        </span>
      </div>
      <div className="preview-caption">
        <div>
          <h3>
            SeedClock{" "}
            <span className="muted">
              #{String(preview.tokenId).padStart(3, "0")}
            </span>
          </h3>
          <p>
            {preview.curve} <span aria-hidden="true">·</span>{" "}
            {preview.traits.Tempo}
          </p>
        </div>
        <Icon name="arrow" />
      </div>
    </button>
  );
}
