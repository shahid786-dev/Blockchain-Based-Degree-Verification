import { Link, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { Alert } from "./components/Notice.jsx";
import { useWallet } from "./context/WalletContext.jsx";
import Admin from "./pages/Admin.jsx";
import Deploy from "./pages/Deploy.jsx";
import Home from "./pages/Home.jsx";
import University from "./pages/University.jsx";
import Verify from "./pages/Verify.jsx";

function NotFound() {
  return (
    <div className="page center">
      <h1>Page not found</h1>
      <Link to="/" className="btn btn-ghost">
        Go home
      </Link>
    </div>
  );
}

export default function App() {
  const { error, clearError } = useWallet();

  return (
    <>
      <Navbar />
      <main className="container">
        <Alert kind="error" onClose={clearError}>
          {error}
        </Alert>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:certId" element={<Verify />} />
          <Route path="/university" element={<University />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/deploy" element={<Deploy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">
          DegreeChain · Blockchain & Technology Applications CEP · Records only, no cryptocurrency
        </div>
      </footer>
    </>
  );
}
