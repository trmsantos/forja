import { Routes, Route } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { CookieNotice } from "./components/CookieNotice";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Account } from "./pages/Account";
import { Settings } from "./pages/Settings";
import { Reminders } from "./pages/Reminders";
import { Audit } from "./pages/Audit";
import { Verify } from "./pages/Verify";
import { Terms } from "./pages/Terms";
import { Privacy } from "./pages/Privacy";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/settings" element={<Settings />} />
          <Route path="/account/reminders" element={<Reminders />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>
      <Footer />
      <CookieNotice />
    </div>
  );
}
