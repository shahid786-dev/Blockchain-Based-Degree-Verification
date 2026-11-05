import { useState } from "react";
import { Link } from "react-router-dom";
import { ContractFactory, formatEther } from "ethers";
import { Alert } from "../components/Notice.jsx";
import RequireWallet from "../components/RequireWallet.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { REGISTRY_ABI } from "../contract/abi.js";
import { REGISTRY_BYTECODE } from "../contract/bytecode.js";
import {
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  IS_LOCAL_CHAIN,
  NETWORK,
  explorerUrl,
  friendlyError,
} from "../lib/blockchain.js";

/**
 * One-time setup page: deploys CertificateRegistry straight from the browser
 * using the connected MetaMask account, so no private key ever has to be
 * copied into a terminal. The connected account becomes the registry owner.
 */
export default function Deploy() {
  const { address, signer } = useWallet();
  const [status, setStatus] = useState(""); // "", "signing", "mining"
  const [txHash, setTxHash] = useState("");
  const [deployed, setDeployed] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function deploy() {
    setError("");
    setTxHash("");
    setDeployed(null);
    try {
      const balance = await signer.provider.getBalance(address);
      if (balance === 0n) {
        setError(`This account has 0 ${CHAIN_NAME} ETH. Get free test ETH from a faucet first.`);
        return;
      }

      setStatus("signing");
      const factory = new ContractFactory(REGISTRY_ABI, REGISTRY_BYTECODE, signer);
      const contract = await factory.deploy();
      const tx = contract.deploymentTransaction();
      setTxHash(tx.hash);

      setStatus("mining");
      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();
      const owner = await contract.owner();

      setDeployed({
        address: contractAddress,
        chainId: CHAIN_ID,
        network: NETWORK,
        owner,
        deployTx: tx.hash,
        deployedAt: new Date().toISOString(),
        balanceBefore: formatEther(balance),
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setStatus("");
    }
  }

  const deploymentJson = deployed
    ? JSON.stringify(
        {
          address: deployed.address,
          chainId: deployed.chainId,
          network: deployed.network,
          owner: deployed.owner,
          deployTx: deployed.deployTx,
          deployedAt: deployed.deployedAt,
        },
        null,
        2
      )
    : "";

  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">One-time setup</span>
        <h1>Deploy the registry</h1>
        <p className="lead">
          Puts the CertificateRegistry smart contract on <strong>{CHAIN_NAME}</strong> using your MetaMask account. The
          account that deploys becomes the registry owner (the regulator on the Admin page).
        </p>
      </section>

      {CONTRACT_ADDRESS ? (
        <Alert kind="success">
          The registry is already deployed at <span className="mono break">{CONTRACT_ADDRESS}</span>. Nothing to do here.{" "}
          <Link to="/admin">Go to Admin</Link>
        </Alert>
      ) : IS_LOCAL_CHAIN ? (
        <Alert kind="info">
          On the local chain, deploy with <code>npm run deploy:local</code> instead.
        </Alert>
      ) : (
        <RequireWallet purpose="Connect the MetaMask account you want to own the registry (use your CEP account, not your FYP one).">
          {!deployed && (
            <div className="panel">
              <h3>Ready to deploy</h3>
              <dl className="cert-grid">
                <div>
                  <dt>Network</dt>
                  <dd>{CHAIN_NAME}</dd>
                </div>
                <div>
                  <dt>Owner will be</dt>
                  <dd className="mono small break">{address}</dd>
                </div>
              </dl>
              <p className="muted small">
                MetaMask will ask you to confirm one transaction. It costs a small amount of free test ETH for gas, no
                real money.
              </p>
              <button className="btn btn-primary btn-lg" onClick={deploy} disabled={Boolean(status)}>
                {status === "signing"
                  ? "Confirm in MetaMask…"
                  : status === "mining"
                    ? "Deploying, please wait (about 15–30 s)…"
                    : "Deploy contract"}
              </button>
              {txHash && (
                <p className="small mt">
                  Transaction:{" "}
                  <a href={explorerUrl("tx", txHash)} target="_blank" rel="noreferrer" className="mono break">
                    {txHash}
                  </a>
                </p>
              )}
            </div>
          )}

          <Alert kind="error" onClose={() => setError("")}>
            {error}
          </Alert>

          {deployed && (
            <div className="panel">
              <Alert kind="success">Contract deployed! 🎉</Alert>
              <div className="tech-row mt">
                <span className="tech-label">Contract address</span>
                <span className="mono break">{deployed.address}</span>
                <span />
              </div>
              <p className="mt">
                <a href={explorerUrl("address", deployed.address)} target="_blank" rel="noreferrer">
                  View on Etherscan
                </a>
              </p>
              <h4 className="mt">Last step</h4>
              <p className="small">
                Copy the details below and send them to whoever manages the repo (they are public, nothing secret). They
                go into <code>frontend/src/contract/deployments/{NETWORK}.json</code>; after that push, the whole site
                switches to this contract.
              </p>
              <pre className="code-block">{deploymentJson}</pre>
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(deploymentJson);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* clipboard blocked */
                  }
                }}
              >
                {copied ? "Copied" : "Copy details"}
              </button>
            </div>
          )}
        </RequireWallet>
      )}
    </div>
  );
}
