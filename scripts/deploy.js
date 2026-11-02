const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys CertificateRegistry and writes its address to the frontend so the
 * React app knows where the contract lives.
 *
 * For local demos the deployer (Hardhat account #0) is the owner (regulator) and
 * Hardhat account #1 is registered as a demo university.
 */
async function main() {
  const [deployer, demoUniversity] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log(`Deploying from ${deployer.address} on chain ${chainId}...`);

  const Registry = await hre.ethers.getContractFactory("CertificateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log(`CertificateRegistry deployed to: ${address}`);

  if (demoUniversity && Number(chainId) === 31337) {
    const name = process.env.DEMO_UNIVERSITY_NAME || "Demo University";
    const tx = await registry.addUniversity(demoUniversity.address, name);
    await tx.wait();
    console.log(`Registered "${name}" (${demoUniversity.address}) as an issuing university.`);
  }

  const outDir = path.join(__dirname, "..", "frontend", "src", "contract");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "deployment.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        address,
        chainId: Number(chainId),
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Saved deployment info to ${path.relative(process.cwd(), outFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
