import { CHAIN_ID, CONTRACT_ADDRESS, RPC_URL, isConfigured } from "../lib/blockchain.js";

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
      <strong>Contract not deployed yet.</strong> Start a local chain with <code>npm run node</code>, then run{" "}
      <code>npm run deploy:local</code> in the project root. That writes the address into{" "}
      <code>frontend/src/contract/deployment.json</code>.
    </Alert>
  );
}

export function NetworkInfo() {
  return (
    <div className="network-info small muted">
      Network <span className="mono">{CHAIN_ID}</span> · RPC <span className="mono">{RPC_URL}</span>
      {CONTRACT_ADDRESS && (
        <>
          {" "}
          · Contract <span className="mono">{CONTRACT_ADDRESS}</span>
        </>
      )}
    </div>
  );
}
