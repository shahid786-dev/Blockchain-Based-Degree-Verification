import { useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import { Alert, NetworkInfo, NotConfigured } from "../components/Notice.jsx";
import RequireWallet from "../components/RequireWallet.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { friendlyError, getReadContract, getWriteContract, isConfigured } from "../lib/blockchain.js";

function UniversityManager({ signer, onChanged }) {
  const [unis, setUnis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ address: "", name: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = getReadContract();
      const addrs = await c.getUniversities();
      const rows = await Promise.all(
        addrs.map(async (a) => {
          const [name, active] = await c.getUniversity(a);
          const issued = await c.getCertificatesByUniversity(a);
          return { address: a, name, active, issued: issued.length };
        })
      );
      setUnis(rows);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const addr = form.address.trim();
    if (!isAddress(addr)) return setError("Enter a valid wallet address (0x…).");
    if (!form.name.trim()) return setError("Enter the university's name.");
    setBusy("add");
    try {
      const tx = await getWriteContract(signer).addUniversity(addr, form.name.trim());
      await tx.wait();
      setSuccess(`${form.name.trim()} can now issue certificates.`);
      setForm({ address: "", name: "" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy("");
    }
  }

  async function toggle(u) {
    setError("");
    setSuccess("");
    setBusy(u.address);
    try {
      const tx = await getWriteContract(signer).setUniversityStatus(u.address, !u.active);
      await tx.wait();
      await load();
      onChanged?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="panel">
        <h3>Approve a university</h3>
        <p className="muted small">Only approved wallets can issue degrees. Add the official wallet of each university.</p>
        <form onSubmit={add} className="form-grid">
          <label>
            University name
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="NED University of Engineering & Technology"
            />
          </label>
          <label>
            Wallet address
            <input
              className="input mono"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="0x…"
              spellCheck={false}
            />
          </label>
          <div className="span-2">
            <button className="btn btn-primary" disabled={busy === "add"}>
              {busy === "add" ? "Waiting for confirmation…" : "Add university"}
            </button>
          </div>
        </form>
        <Alert kind="error" onClose={() => setError("")}>
          {error}
        </Alert>
        <Alert kind="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      </div>

      <div className="panel">
        <h3>Registered universities ({unis.length})</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : unis.length === 0 ? (
          <p className="muted">No universities yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Wallet</th>
                  <th>Issued</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {unis.map((u) => (
                  <tr key={u.address}>
                    <td>{u.name}</td>
                    <td className="mono small">{u.address}</td>
                    <td>{u.issued}</td>
                    <td>
                      <span className={`badge ${u.active ? "badge-ok" : "badge-bad"}`}>{u.active ? "Active" : "Suspended"}</span>
                    </td>
                    <td className="actions">
                      <button
                        className={`btn btn-xs ${u.active ? "btn-danger" : "btn-ghost"}`}
                        disabled={busy === u.address}
                        onClick={() => toggle(u)}
                      >
                        {busy === u.address ? "…" : u.active ? "Suspend" : "Re-activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Stats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const c = getReadContract();
    Promise.all([c.totalCertificates(), c.getUniversities(), c.owner()])
      .then(([total, unis, owner]) => setStats({ total: Number(total), unis: unis.length, owner }))
      .catch(() => setStats(null));
  }, []);
  if (!stats) return null;
  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-num">{stats.total}</div>
        <div className="stat-label">Certificates recorded</div>
      </div>
      <div className="stat">
        <div className="stat-num">{stats.unis}</div>
        <div className="stat-label">Universities</div>
      </div>
      <div className="stat stat-wide">
        <div className="stat-label">Registry owner</div>
        <div className="mono small break">{stats.owner}</div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { signer, role, refreshRole } = useWallet();

  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">Regulator console</span>
        <h1>Admin</h1>
        <p className="lead">The regulator (e.g. HEC) decides which universities are allowed to issue degrees.</p>
      </section>

      <NotConfigured />

      {isConfigured() && (
        <>
          <Stats />
          <RequireWallet purpose="Connect the registry owner's wallet to manage universities.">
            {role.isOwner ? (
              <UniversityManager signer={signer} onChanged={refreshRole} />
            ) : (
              <Alert kind="warn">Only the registry owner can manage universities. Switch to the owner account in MetaMask.</Alert>
            )}
          </RequireWallet>
          <NetworkInfo />
        </>
      )}
    </div>
  );
}
