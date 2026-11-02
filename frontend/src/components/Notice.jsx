import {
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  IS_LOCAL_CHAIN,
  NETWORK,
  explorerUrl,
  isConfigured,
} from "../lib/blockchain.js";

export function Alert({ kind = "info", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <div>{children}</div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

/** Shown when the contract hasn't been deployed / configured yet. */
export function NotConfigured() {
  if (isConfigured()) return null;
  return (
    <Alert kind="warn">
      <strong>Contract not deployed yet.</strong>{" "}
      {IS_LOCAL_CHAIN ? (
        <>
          Start a local chain with <code>npm run node</code>, then run <code>npm run deploy:local</code> in the project
          root.
        </>
      ) : (
        <>
          Run <code>npm run deploy:{NETWORK}</code>, then commit and push{" "}
          <code>frontend/src/contract/deployments/{NETWORK}.json</code>.
        </>
      )}
    </Alert>
  );
}

export function NetworkInfo() {
  const link = explorerUrl("address", CONTRACT_ADDRESS);
  return (
    <div className="network-info small muted">
      {CHAIN_NAME} <span className="mono">({CHAIN_ID})</span>
      {CONTRACT_ADDRESS && (
        <>
          {" "}
          · Contract{" "}
          {link ? (
            <a href={link} target="_blank" rel="noreferrer" className="mono">
              {CONTRACT_ADDRESS}
            </a>
          ) : (
            <span className="mono">{CONTRACT_ADDRESS}</span>
          )}
        </>
      )}
    </div>
  );
}
