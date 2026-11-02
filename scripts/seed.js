const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const hre = require("hardhat");

/**
 * Issues a few sample certificates from the demo university so the app has data
 * to show during a presentation. Run after `npm run deploy:local`.
 *
 * Each sample gets a small text "document"; its SHA-256 hash is stored on-chain.
 * The files are written to ./sample-certificates so you can upload them on the
 * Verify page and see a "Genuine" result (edit one byte and see it fail).
 */
async function main() {
  const deploymentFile = path.join(__dirname, "..", "frontend", "src", "contract", "deployment.json");
  const { address } = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  if (!address) throw new Error("No contract address found. Run `npm run deploy:local` first.");

  const [, demoUniversity] = await hre.ethers.getSigners();
  const registry = await hre.ethers.getContractAt("CertificateRegistry", address, demoUniversity);

  const samples = [
    { studentName: "Ali Raza", rollNumber: "CS-2021-045", degreeTitle: "BS Computer Science", cgpa: "3.62", graduationYear: 2025 },
    { studentName: "Ayesha Khan", rollNumber: "SE-2021-012", degreeTitle: "BS Software Engineering", cgpa: "3.88", graduationYear: 2025 },
    { studentName: "Hamza Ahmed", rollNumber: "EE-2020-101", degreeTitle: "BE Electrical Engineering", cgpa: "3.15", graduationYear: 2024 },
  ];

  const outDir = path.join(__dirname, "..", "sample-certificates");
  fs.mkdirSync(outDir, { recursive: true });

  for (const s of samples) {
    const content =
      `DEGREE CERTIFICATE\n\n` +
      `This is to certify that ${s.studentName} (Roll No. ${s.rollNumber})\n` +
      `has been awarded the degree of ${s.degreeTitle}\n` +
      `with a CGPA of ${s.cgpa} in the year ${s.graduationYear}.\n`;
    const fileName = `${s.rollNumber}.txt`;
    fs.writeFileSync(path.join(outDir, fileName), content);

    const documentHash = "0x" + crypto.createHash("sha256").update(content).digest("hex");
    const existing = await registry.findByDocumentHash(documentHash);
    if (existing !== hre.ethers.ZeroHash) {
      console.log(`Skipping ${s.rollNumber}: already issued as ${existing}`);
      continue;
    }

    const tx = await registry.issueCertificate(
      s.studentName,
      s.rollNumber,
      s.degreeTitle,
      s.cgpa,
      s.graduationYear,
      documentHash
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return registry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CertificateIssued");

    console.log(`Issued ${s.rollNumber} -> certId ${event.args.certId}  (file: sample-certificates/${fileName})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
