import { useWallet } from "../context/WalletContext.jsx";
import { hasWallet } from "../lib/blockchain.js";

/** Asks the user to connect MetaMask before showing children. */
export default function RequireWallet({ children, purpose }) {
  const { address, connect, connecting } = useWallet();
  if (address) return children;

  return (
    <div className="panel center">
      <h3>Connect your wallet</h3>
      <p className="muted">{purpose}</p>
      {hasWallet() ? (
        <button className="btn btn-primary" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect MetaMask"}
        </button>
      ) : (
        <p>
          MetaMask is not installed.{" "}
          <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
            Install MetaMask
          </a>{" "}
          and reload this page.
        </p>
      )}
    </div>
  );
}
