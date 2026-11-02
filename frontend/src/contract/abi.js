// Human-readable ABI for CertificateRegistry.sol.
// Kept by hand so the frontend builds without compiling the contract first.
// If you change the contract's public functions, update this list too.

const CERT_TUPLE =
  "tuple(bytes32 certId, string studentName, string rollNumber, string degreeTitle, string cgpa, uint16 graduationYear, bytes32 documentHash, address issuer, uint256 issuedAt, bool revoked, string revokeReason)";

export const REGISTRY_ABI = [
  // Read
  "function owner() view returns (address)",
  "function totalCertificates() view returns (uint256)",
  `function verifyCertificate(bytes32 certId) view returns (bool exists, bool valid, ${CERT_TUPLE} cert, string universityName)`,
  "function findByDocumentHash(bytes32 documentHash) view returns (bytes32 certId)",
  "function getUniversity(address university) view returns (string name, bool active, bool registered)",
  "function getUniversities() view returns (address[])",
  "function getCertificatesByUniversity(address university) view returns (bytes32[])",

  // Write
  "function transferOwnership(address newOwner)",
  "function addUniversity(address university, string name)",
  "function setUniversityStatus(address university, bool active)",
  "function issueCertificate(string studentName, string rollNumber, string degreeTitle, string cgpa, uint16 graduationYear, bytes32 documentHash) returns (bytes32 certId)",
  "function revokeCertificate(bytes32 certId, string reason)",

  // Events
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event UniversityAdded(address indexed university, string name)",
  "event UniversityStatusChanged(address indexed university, bool active)",
  "event CertificateIssued(bytes32 indexed certId, address indexed issuer, bytes32 indexed documentHash, string rollNumber)",
  "event CertificateRevoked(bytes32 indexed certId, address indexed issuer, string reason)",

  // Errors (so revert reasons are readable)
  "error NotOwner()",
  "error NotActiveUniversity()",
  "error InvalidAddress()",
  "error EmptyField()",
  "error UniversityAlreadyRegistered()",
  "error UniversityNotRegistered()",
  "error InvalidDocumentHash()",
  "error DocumentAlreadyRegistered(bytes32 existingCertId)",
  "error CertificateNotFound()",
  "error NotIssuer()",
  "error AlreadyRevoked()",
];
