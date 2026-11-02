const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys CertificateRegistry and writes its address to
 * frontend/src/contract/deployments/<network>.json so the React app can find it.
 *
 *  - localhost: account #0 is the owner (regulator), account #1 is registered as
 *    "Demo University".
 *  - sepolia:   the deploying wallet is the owner. Approve universities from the
 *    Admin page (you may add your own wallet as a university for the demo).
 */
async function main() {
  const network = hre.network.name;
  if (network === "hardhat") {
    console.warn("Deploying to the throwaway in-process network. Use --network localhost or --network sepolia.");
  }

  const [deployer, demoUniversity] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`Network:  ${network} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} test ETH`);
  if (balance === 0n) throw new Error("Deployer has no test ETH for gas. Get some from a Sepolia faucet first.");

  const Registry = await hre.ethers.getContractFactory("CertificateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();

  console.log(`\nCertificateRegistry deployed to: ${address}`);

  if (Number(chainId) === 31337 && demoUniversity) {
    const name = process.env.DEMO_UNIVERSITY_NAME || "Demo University";
    const tx = await registry.addUniversity(demoUniversity.address, name);
    await tx.wait();
    console.log(`Registered "${name}" (${demoUniversity.address}) as an issuing university.`);
  }

  const outDir = path.join(__dirname, "..", "frontend", "src", "contract", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        address,
        chainId: Number(chainId),
        network,
        owner: deployer.address,
        deployTx: deployTx ? deployTx.hash : null,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Saved deployment info to ${path.relative(process.cwd(), outFile)}`);

  if (Number(chainId) === 11155111) {
    console.log(`\nView on Etherscan: https://sepolia.etherscan.io/address/${address}`);
    console.log("Next: commit and push frontend/src/contract/deployments/sepolia.json so Vercel picks it up.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
