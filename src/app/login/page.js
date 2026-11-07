import LoginForm from "./LoginForm";
import AsciiField from "../components/AsciiField";

export const metadata = {
  title: "Sign in · Rapids QR",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <AsciiField />
      <div className="shell login-shell">
        <header className="topbar">
          <span className="topbar-brand">rapids<span className="topbar-slash">/</span>qr</span>
          <span className="topbar-meta"><span>private</span></span>
        </header>

        <main className="login-main">
          <section className="panel login-panel">
            <div className="panel-bar">
              <span>┌─ sign in</span>
              <span>locked</span>
            </div>
            <div className="panel-body">
              <h1 className="login-title">Rapids QR</h1>
              <p className="hint login-sub">Enter your username and password to continue.</p>
              <LoginForm />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
