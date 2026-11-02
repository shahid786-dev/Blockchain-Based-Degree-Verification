import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { connectWallet, friendlyError, getRole, hasWallet, isConfigured } from "../lib/blockchain.js";

const WalletContext = createContext(null);

const EMPTY_ROLE = { isOwner: false, isUniversity: false, universityActive: false, universityName: "" };

export function WalletProvider({ children }) {
  const [address, setAddress] = useState("");
  const [signer, setSigner] = useState(null);
  const [role, setRole] = useState(EMPTY_ROLE);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const loadRole = useCallback(async (addr) => {
    if (!addr || !isConfigured()) return setRole(EMPTY_ROLE);
    try {
      setRole(await getRole(addr));
    } catch (err) {
      setRole(EMPTY_ROLE);
      setError(friendlyError(err));
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      const { address: addr, signer: s } = await connectWallet();
      setAddress(addr);
      setSigner(s);
      await loadRole(addr);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setConnecting(false);
    }
  }, [loadRole]);

  const disconnect = useCallback(() => {
    setAddress("");
    setSigner(null);
    setRole(EMPTY_ROLE);
  }, []);

  // Follow account / network switches made inside MetaMask.
  useEffect(() => {
    if (!hasWallet()) return;
    const onAccounts = (accounts) => {
      if (!accounts.length) disconnect();
      else if (address) connect();
    };
    const onChain = () => {
      if (address) connect();
    };
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, [address, connect, disconnect]);

  const value = {
    address,
    signer,
    role,
    connecting,
    error,
    clearError: () => setError(""),
    connect,
    disconnect,
    refreshRole: () => loadRole(address),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
