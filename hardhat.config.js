require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

/**
 * Networks
 *  - hardhat / localhost : local test chain (chainId 31337).
 *  - sepolia             : Ethereum's public TEST network. Test ETH from a faucet
 *                          only pays for "gas"; no real money or cryptocurrency is used.
 *
 * Secrets are stored with Hardhat's encrypted-at-rest config vars, never in the repo:
 *   npx hardhat vars set SEPOLIA_PRIVATE_KEY
 *   npx hardhat vars set SEPOLIA_RPC_URL      (optional, a public RPC is used by default)
 */
const networks = {
  hardhat: { chainId: 31337 },
  localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
};

if (vars.has("SEPOLIA_PRIVATE_KEY")) {
  networks.sepolia = {
    url: vars.get("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com"),
    accounts: [vars.get("SEPOLIA_PRIVATE_KEY")],
    chainId: 11155111,
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks,
};
