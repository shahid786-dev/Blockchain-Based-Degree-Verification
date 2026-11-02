const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const sha256 = (text) => ethers.sha256(ethers.toUtf8Bytes(text));

const SAMPLE = {
  studentName: "Ali Raza",
  rollNumber: "CS-2021-045",
  degreeTitle: "BS Computer Science",
  cgpa: "3.62",
  graduationYear: 2025,
  documentHash: sha256("ali-raza-degree.pdf contents"),
};

async function issue(registry, signer, overrides = {}) {
  const s = { ...SAMPLE, ...overrides };
  const tx = await registry
    .connect(signer)
    .issueCertificate(s.studentName, s.rollNumber, s.degreeTitle, s.cgpa, s.graduationYear, s.documentHash);
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
  return event.args.certId;
}

describe("CertificateRegistry", function () {
  async function deployFixture() {
    const [owner, university, otherUniversity, outsider] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CertificateRegistry");
    const registry = await Registry.deploy();
    await registry.addUniversity(university.address, "NED University");
    await registry.addUniversity(otherUniversity.address, "FAST NUCES");
    return { registry, owner, university, otherUniversity, outsider };
  }

  describe("Deployment & roles", function () {
    it("sets the deployer as owner", async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("lets the owner register universities", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      const [name, active, registered] = await registry.getUniversity(university.address);
      expect(name).to.equal("NED University");
      expect(active).to.equal(true);
      expect(registered).to.equal(true);
      expect(await registry.getUniversities()).to.have.lengthOf(2);
    });

    it("blocks non-owners from registering universities", async function () {
      const { registry, outsider } = await loadFixture(deployFixture);
      await expect(
        registry.connect(outsider).addUniversity(outsider.address, "Fake Uni")
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("rejects duplicate university registration", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await expect(
        registry.addUniversity(university.address, "Again")
      ).to.be.revertedWithCustomError(registry, "UniversityAlreadyRegistered");
    });

    it("transfers ownership", async function () {
      const { registry, owner, outsider } = await loadFixture(deployFixture);
      await expect(registry.transferOwnership(outsider.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, outsider.address);
      expect(await registry.owner()).to.equal(outsider.address);
    });
  });

  describe("Issuing", function () {
    it("issues a certificate and emits an event", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await expect(
        registry
          .connect(university)
          .issueCertificate(
            SAMPLE.studentName,
            SAMPLE.rollNumber,
            SAMPLE.degreeTitle,
            SAMPLE.cgpa,
            SAMPLE.graduationYear,
            SAMPLE.documentHash
          )
      )
        .to.emit(registry, "CertificateIssued")
        .withArgs(anyValue, university.address, SAMPLE.documentHash, SAMPLE.rollNumber);
      expect(await registry.totalCertificates()).to.equal(1n);
    });

    it("stores every field correctly", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      const certId = await issue(registry, university);
      const [exists, valid, cert, universityName] = await registry.verifyCertificate(certId);

      expect(exists).to.equal(true);
      expect(valid).to.equal(true);
      expect(universityName).to.equal("NED University");
      expect(cert.certId).to.equal(certId);
      expect(cert.studentName).to.equal(SAMPLE.studentName);
      expect(cert.rollNumber).to.equal(SAMPLE.rollNumber);
      expect(cert.degreeTitle).to.equal(SAMPLE.degreeTitle);
      expect(cert.cgpa).to.equal(SAMPLE.cgpa);
      expect(cert.graduationYear).to.equal(SAMPLE.graduationYear);
      expect(cert.documentHash).to.equal(SAMPLE.documentHash);
      expect(cert.issuer).to.equal(university.address);
      expect(cert.revoked).to.equal(false);
    });

    it("only lets active universities issue", async function () {
      const { registry, outsider } = await loadFixture(deployFixture);
      await expect(issue(registry, outsider)).to.be.revertedWithCustomError(registry, "NotActiveUniversity");
    });

    it("blocks a suspended university from issuing", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await registry.setUniversityStatus(university.address, false);
      await expect(issue(registry, university)).to.be.revertedWithCustomError(registry, "NotActiveUniversity");
    });

    it("keeps old certificates valid after a university is suspended", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      const certId = await issue(registry, university);
      await registry.setUniversityStatus(university.address, false);
      const [, valid] = await registry.verifyCertificate(certId);
      expect(valid).to.equal(true);
    });

    it("rejects the same document being registered twice", async function () {
      const { registry, university, otherUniversity } = await loadFixture(deployFixture);
      await issue(registry, university);
      await expect(issue(registry, otherUniversity, { rollNumber: "X-1" })).to.be.revertedWithCustomError(
        registry,
        "DocumentAlreadyRegistered"
      );
    });

    it("rejects empty fields and an empty hash", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await expect(issue(registry, university, { studentName: "" })).to.be.revertedWithCustomError(
        registry,
        "EmptyField"
      );
      await expect(issue(registry, university, { graduationYear: 0 })).to.be.revertedWithCustomError(
        registry,
        "EmptyField"
      );
      await expect(issue(registry, university, { documentHash: ethers.ZeroHash })).to.be.revertedWithCustomError(
        registry,
        "InvalidDocumentHash"
      );
    });

    it("lists certificates per university", async function () {
      const { registry, university, otherUniversity } = await loadFixture(deployFixture);
      const a = await issue(registry, university);
      const b = await issue(registry, university, { rollNumber: "CS-2", documentHash: sha256("two") });
      await issue(registry, otherUniversity, { rollNumber: "F-1", documentHash: sha256("three") });

      expect(await registry.getCertificatesByUniversity(university.address)).to.deep.equal([a, b]);
      expect(await registry.getCertificatesByUniversity(otherUniversity.address)).to.have.lengthOf(1);
    });
  });

  describe("Verification", function () {
    it("finds a certificate by its document hash", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      const certId = await issue(registry, university);
      expect(await registry.findByDocumentHash(SAMPLE.documentHash)).to.equal(certId);
    });

    it("returns zero for a tampered / unknown document", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      await issue(registry, university);
      const tampered = sha256("ali-raza-degree.pdf contents (edited)");
      expect(await registry.findByDocumentHash(tampered)).to.equal(ethers.ZeroHash);
    });

    it("reports a non-existent certificate ID as not found", async function () {
      const { registry } = await loadFixture(deployFixture);
      const [exists, valid] = await registry.verifyCertificate(ethers.id("does-not-exist"));
      expect(exists).to.equal(false);
      expect(valid).to.equal(false);
    });
  });

  describe("Revocation", function () {
    it("lets the issuing university revoke", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      const certId = await issue(registry, university);

      await expect(registry.connect(university).revokeCertificate(certId, "Issued in error"))
        .to.emit(registry, "CertificateRevoked")
        .withArgs(certId, university.address, "Issued in error");

      const [exists, valid, cert] = await registry.verifyCertificate(certId);
      expect(exists).to.equal(true);
      expect(valid).to.equal(false);
      expect(cert.revoked).to.equal(true);
      expect(cert.revokeReason).to.equal("Issued in error");
    });

    it("blocks other universities and outsiders from revoking", async function () {
      const { registry, university, otherUniversity, outsider } = await loadFixture(deployFixture);
      const certId = await issue(registry, university);
      await expect(
        registry.connect(otherUniversity).revokeCertificate(certId, "nope")
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
      await expect(
        registry.connect(outsider).revokeCertificate(certId, "nope")
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("rejects revoking twice, unknown IDs and empty reasons", async function () {
      const { registry, university } = await loadFixture(deployFixture);
      const certId = await issue(registry, university);

      await expect(
        registry.connect(university).revokeCertificate(certId, "")
      ).to.be.revertedWithCustomError(registry, "EmptyField");

      await registry.connect(university).revokeCertificate(certId, "Fraud");
      await expect(
        registry.connect(university).revokeCertificate(certId, "Again")
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");

      await expect(
        registry.connect(university).revokeCertificate(ethers.id("missing"), "x")
      ).to.be.revertedWithCustomError(registry, "CertificateNotFound");
    });
  });
});
