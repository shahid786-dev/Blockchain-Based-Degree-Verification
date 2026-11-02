import { BrowserProvider, Contract, JsonRpcProvider, isHexString } from "ethers";
import { REGISTRY_ABI } from "../contract/abi.js";

// deployments/<network>.json files are written by `scripts/deploy.js`.
// Missing files are fine: the app then shows a "not deployed" notice.
const DEPLOYMENTS = import.meta.glob("../contract/deployments/*.json", { eager: true, import: "default" });

/** Which deployment to use: "localhost" (default) or "sepolia". Set VITE_NETWORK on Vercel. */
export const NETWORK = import.meta.env.VITE_NETWORK || "localhost";
const deployment = DEPLOYMENTS[`../contract/deployments/${NETWORK}.json`] || {};

const KNOWN_CHAINS = {
  31337: {
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    explorer: "",
    local: true,
  },
  11155111: {
    chainName: "Sepolia Test Network",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    local: false,
  },
};

const DEFAULT_CHAIN_ID = NETWORK === "sepolia" ? 11155111 : 31337;

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || deployment.chainId || DEFAULT_CHAIN_ID);
const CHAIN = KNOWN_CHAINS[CHAIN_ID] || { chainName: `Chain ${CHAIN_ID}`, rpcUrl: "", explorer: "", local: false };

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || deployment.address || "";
export const RPC_URL = import.meta.env.VITE_RPC_URL || CHAIN.rpcUrl;
export const CHAIN_NAME = CHAIN.chainName;
export const IS_LOCAL_CHAIN = CHAIN.local;

const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);

/** Link to a block explorer page, or "" on the local chain. */
export function explorerUrl(kind, value) {
  if (!CHAIN.explorer || !value) return "";
  return `${CHAIN.explorer}/${kind}/${value}`;
}

const ERROR_MESSAGES = {
  NotOwner: "Only the registry owner (regulator) can do this.",
  NotActiveUniversity: "This wallet is not an active, approved university.",
  InvalidAddress: "That wallet address is not valid.",
  EmptyField: "Please fill in every field.",
  UniversityAlreadyRegistered: "This university is already registered.",
  UniversityNotRegistered: "This university is not registered.",
  InvalidDocumentHash: "The document hash is empty. Please upload the degree file.",
  DocumentAlreadyRegistered: "This exact document is already registered on the blockchain.",
  CertificateNotFound: "No certificate exists with this ID.",
  NotIssuer: "Only the university that issued this certificate can revoke it.",
  AlreadyRevoked: "This certificate has already been revoked.",
};

export function isConfigured() {
  return Boolean(CONTRACT_ADDRESS);
}

let readContract;
/** Read-only contract that works without a wallet (used by the public Verify page). */
export function getReadContract() {
  if (!readContract) {
    const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
    readContract = new Contract(CONTRACT_ADDRESS, REGISTRY_ABI, provider);
  }
  return readContract;
}

export function hasWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

async function ensureCorrectNetwork() {
  const current = await window.ethereum.request({ method: "eth_chainId" });
  if (parseInt(current, 16) === CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not added to the wallet yet
    if (err?.code === 4902 && RPC_URL) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: CHAIN_NAME,
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Test ETH", symbol: "ETH", decimals: 18 },
            ...(CHAIN.explorer ? { blockExplorerUrls: [CHAIN.explorer] } : {}),
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/** Ask the wallet (MetaMask) for an account and return { address, signer }. */
export async function connectWallet() {
  if (!hasWallet()) throw new Error("MetaMask not found. Please install the MetaMask browser extension.");
  await ensureCorrectNetwork();
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { address: await signer.getAddress(), signer };
}

export function getWriteContract(signer) {
  return new Contract(CONTRACT_ADDRESS, REGISTRY_ABI, signer);
}

/** Works out what a wallet is allowed to do. */
export async function getRole(address) {
  const c = getReadContract();
  const [owner, uni] = await Promise.all([c.owner(), c.getUniversity(address)]);
  return {
    isOwner: owner.toLowerCase() === address.toLowerCase(),
    isUniversity: uni.registered,
    universityActive: uni.active,
    universityName: uni.name,
  };
}

export function isCertId(value) {
  return isHexString(value, 32);
}

export function normaliseCertId(value) {
  const v = (value || "").trim();
  return v.startsWith("0x") ? v : `0x${v}`;
}

/** Turn a contract/wallet error into a sentence a user can understand. */
export function friendlyError(err) {
  if (!err) return "Something went wrong.";
  if (err.code === "ACTION_REJECTED" || err.code === 4001) return "You rejected the request in your wallet.";
  if (err.code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(err.message || "")) {
    return IS_LOCAL_CHAIN
      ? "This account has no test ETH for gas."
      : `This wallet has no ${CHAIN_NAME} test ETH for gas. Get some free from a Sepolia faucet.`;
  }

  const name = err.revert?.name || err.errorName;
  if (name && ERROR_MESSAGES[name]) return ERROR_MESSAGES[name];

  if (err.code === "NETWORK_ERROR" || /failed to fetch|ECONNREFUSED|could not detect network/i.test(err.message || "")) {
    return IS_LOCAL_CHAIN
      ? "Can't reach the local blockchain. Is `npm run node` running?"
      : `Can't reach the ${CHAIN_NAME} RPC right now. Please try again in a moment.`;
  }
  if (err.code === "BAD_DATA" || err.code === "CALL_EXCEPTION") {
    return "The contract did not respond as expected. Check the contract address and that it is deployed on this network.";
  }
  return err.shortMessage || err.reason || err.message || "Something went wrong.";
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatDate(unixSeconds) {
  const n = Number(unixSeconds);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Plain JS object from an ethers Result for the certificate tuple. */
export function toCertificate(result) {
  const [exists, valid, cert, universityName] = result;
  return {
    exists,
    valid,
    universityName,
    certId: cert.certId,
    studentName: cert.studentName,
    rollNumber: cert.rollNumber,
    degreeTitle: cert.degreeTitle,
    cgpa: cert.cgpa,
    graduationYear: Number(cert.graduationYear),
    documentHash: cert.documentHash,
    issuer: cert.issuer,
    issuedAt: Number(cert.issuedAt),
    revoked: cert.revoked,
    revokeReason: cert.revokeReason,
  };
}
