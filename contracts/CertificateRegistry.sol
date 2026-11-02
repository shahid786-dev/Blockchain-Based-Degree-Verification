// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CertificateRegistry
 * @notice Tamper-proof registry of academic degrees / certificates.
 *
 * Roles
 *  - Owner (e.g. HEC / regulator): approves universities that may issue degrees.
 *  - University: issues and revokes certificates it has issued.
 *  - Anyone (employer, embassy, student): verifies a certificate for free (read-only).
 *
 * Only a SHA-256 fingerprint of the degree PDF is stored on-chain, never the file
 * itself. Any change to the PDF (even one character) changes the hash, so a
 * forged or edited document will not match the on-chain record.
 *
 * No cryptocurrency / token logic is involved: the chain is used purely as an
 * append-only, verifiable record store.
 */
contract CertificateRegistry {
    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------

    struct University {
        string name;
        bool active;
        bool registered;
    }

    struct Certificate {
        bytes32 certId;
        string studentName;
        string rollNumber;
        string degreeTitle;
        string cgpa;
        uint16 graduationYear;
        bytes32 documentHash;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        string revokeReason;
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------

    address public owner;
    uint256 public totalCertificates;

    mapping(address => University) private universities;
    address[] private universityList;

    mapping(bytes32 => Certificate) private certificates;
    mapping(bytes32 => bytes32) private hashToCertId;
    mapping(address => bytes32[]) private issuedBy;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event UniversityAdded(address indexed university, string name);
    event UniversityStatusChanged(address indexed university, bool active);
    event CertificateIssued(
        bytes32 indexed certId,
        address indexed issuer,
        bytes32 indexed documentHash,
        string rollNumber
    );
    event CertificateRevoked(bytes32 indexed certId, address indexed issuer, string reason);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error NotOwner();
    error NotActiveUniversity();
    error InvalidAddress();
    error EmptyField();
    error UniversityAlreadyRegistered();
    error UniversityNotRegistered();
    error InvalidDocumentHash();
    error DocumentAlreadyRegistered(bytes32 existingCertId);
    error CertificateNotFound();
    error NotIssuer();
    error AlreadyRevoked();

    // ------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyActiveUniversity() {
        if (!universities[msg.sender].active) revert NotActiveUniversity();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ------------------------------------------------------------------
    // Owner functions
    // ------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addUniversity(address university, string calldata name) external onlyOwner {
        if (university == address(0)) revert InvalidAddress();
        if (bytes(name).length == 0) revert EmptyField();
        if (universities[university].registered) revert UniversityAlreadyRegistered();

        universities[university] = University({name: name, active: true, registered: true});
        universityList.push(university);

        emit UniversityAdded(university, name);
    }

    /// @notice Suspend or re-activate a university. Certificates it already
    ///         issued stay valid; a suspended university just can't issue new ones.
    function setUniversityStatus(address university, bool active) external onlyOwner {
        if (!universities[university].registered) revert UniversityNotRegistered();
        universities[university].active = active;
        emit UniversityStatusChanged(university, active);
    }

    // ------------------------------------------------------------------
    // University functions
    // ------------------------------------------------------------------

    function issueCertificate(
        string memory studentName,
        string memory rollNumber,
        string memory degreeTitle,
        string memory cgpa,
        uint16 graduationYear,
        bytes32 documentHash
    ) external onlyActiveUniversity returns (bytes32 certId) {
        if (
            bytes(studentName).length == 0 ||
            bytes(rollNumber).length == 0 ||
            bytes(degreeTitle).length == 0 ||
            bytes(cgpa).length == 0 ||
            graduationYear == 0
        ) revert EmptyField();
        if (documentHash == bytes32(0)) revert InvalidDocumentHash();

        bytes32 existing = hashToCertId[documentHash];
        if (existing != bytes32(0)) revert DocumentAlreadyRegistered(existing);

        certId = keccak256(
            abi.encode(msg.sender, rollNumber, documentHash, totalCertificates, block.chainid)
        );

        Certificate storage c = certificates[certId];
        c.certId = certId;
        c.studentName = studentName;
        c.rollNumber = rollNumber;
        c.degreeTitle = degreeTitle;
        c.cgpa = cgpa;
        c.graduationYear = graduationYear;
        c.documentHash = documentHash;
        c.issuer = msg.sender;
        c.issuedAt = block.timestamp;

        hashToCertId[documentHash] = certId;
        issuedBy[msg.sender].push(certId);
        totalCertificates += 1;

        emit CertificateIssued(certId, msg.sender, documentHash, rollNumber);
    }

    /// @notice Only the university that issued a certificate can revoke it.
    function revokeCertificate(bytes32 certId, string calldata reason) external {
        Certificate storage c = certificates[certId];
        if (c.issuer == address(0)) revert CertificateNotFound();
        if (c.issuer != msg.sender) revert NotIssuer();
        if (c.revoked) revert AlreadyRevoked();
        if (bytes(reason).length == 0) revert EmptyField();

        c.revoked = true;
        c.revokeReason = reason;

        emit CertificateRevoked(certId, msg.sender, reason);
    }

    // ------------------------------------------------------------------
    // Public read-only functions (verification)
    // ------------------------------------------------------------------

    /// @return exists         true if a certificate with this ID was ever issued
    /// @return valid          true if it exists and has not been revoked
    /// @return cert           the full on-chain record
    /// @return universityName name of the issuing university
    function verifyCertificate(bytes32 certId)
        external
        view
        returns (bool exists, bool valid, Certificate memory cert, string memory universityName)
    {
        cert = certificates[certId];
        exists = cert.issuer != address(0);
        valid = exists && !cert.revoked;
        universityName = universities[cert.issuer].name;
    }

    /// @notice Look up a certificate by the SHA-256 hash of its PDF.
    /// @return certId bytes32(0) if no certificate matches this document
    function findByDocumentHash(bytes32 documentHash) external view returns (bytes32 certId) {
        return hashToCertId[documentHash];
    }

    function getUniversity(address university)
        external
        view
        returns (string memory name, bool active, bool registered)
    {
        University storage u = universities[university];
        return (u.name, u.active, u.registered);
    }

    function getUniversities() external view returns (address[] memory) {
        return universityList;
    }

    function getCertificatesByUniversity(address university) external view returns (bytes32[] memory) {
        return issuedBy[university];
    }
}
