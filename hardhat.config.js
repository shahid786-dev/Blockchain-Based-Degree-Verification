require("@nomicfoundation/hardhat-toolbox");

/**
 * Networks
 *  - hardhat / localhost : local test chain (chainId 31337). Test ETH only pays
 *    for "gas" inside the simulator; no real money or cryptocurrency is used.
 *  - sepolia (optional)  : only enabled when SEPOLIA_RPC_URL and PRIVATE_KEY are
 *    set in the environment. Kept for the later deployment step.
 */
const networks = {
  hardhat: { chainId: 31337 },
  localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
};

if (process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY) {
  networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
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
