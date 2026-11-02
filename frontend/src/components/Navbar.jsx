import { NavLink, Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";
import { CHAIN_NAME, IS_LOCAL_CHAIN, shortAddress } from "../lib/blockchain.js";

export default function Navbar() {
  const { address, role, connect, disconnect, connecting } = useWallet();

  const roleLabel = role.isOwner
    ? "Regulator"
    : role.isUniversity
      ? role.universityName
      : address
        ? "Visitor"
        : "";

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span>
          DegreeChain
        </Link>

        <nav className="nav-links">
          <NavLink to="/verify">Verify</NavLink>
          <NavLink to="/university">University</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>

        <div className="nav-wallet">
          <span className={`net-chip ${IS_LOCAL_CHAIN ? "net-local" : "net-test"}`} title="Blockchain network">
            {CHAIN_NAME}
          </span>
          {address ? (
            <>
              <span className="wallet-pill" title={address}>
                {roleLabel && <span className="wallet-role">{roleLabel}</span>}
                <span className="mono">{shortAddress(address)}</span>
              </span>
              <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
