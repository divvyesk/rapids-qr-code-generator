"use strict";

"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("url"); // 'url' or 'contact'

  // Global mousemove spotlight listener
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // URL Tab State
  const [urlInput, setUrlInput] = useState("");

  // Contact Info Tab State
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    email: "",
    street: "",
    city: "",
    region: "",
    postcode: "",
    country: ""
  });

  // Multiple Phone Numbers State (Initial state with 1 compulsory empty field)
  const [phones, setPhones] = useState([""]);

  // Multiple URLs State (Initial state with 1 empty field)
  const [urls, setUrls] = useState([""]);

  // Generated Result State
  const [qrValue, setQrValue] = useState("");
  const [generatedType, setGeneratedType] = useState(""); // 'url' or 'contact'
  const [errorMsg, setErrorMsg] = useState("");

  const qrRef = useRef(null);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  // Phone number handlers
  const handlePhoneChange = (index, value) => {
    const updated = [...phones];
    updated[index] = value;
    setPhones(updated);
  };

  const addPhoneField = () => {
    setPhones([...phones, ""]);
  };

  const removePhoneField = (index) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  // URL handlers
  const handleUrlChange = (index, value) => {
    const updated = [...urls];
    updated[index] = value;
    setUrls(updated);
  };

  const addUrlField = () => {
    setUrls([...urls, ""]);
  };

  const removeUrlField = (index) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  // Pre-fill helpers
  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
    } catch (err) {
      console.warn("Clipboard access denied:", err);
    }
  };

  // Form submission / QR Generation
  const handleGenerate = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setQrValue("");

    if (activeTab === "url") {
      if (!urlInput.trim()) {
        setErrorMsg("Please enter or paste a valid URL.");
        return;
      }

      // Ensure URL has protocol
      let finalUrl = urlInput.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }

      setQrValue(finalUrl);
      setGeneratedType("url");
    } else {
      // Validate compulsory fields
      if (!contactForm.firstName.trim()) {
        setErrorMsg("First Name is a compulsory field.");
        return;
      }

      // Filter empty entries
      const activePhones = phones.filter(p => p.trim() !== "");
      const activeUrls = urls.filter(u => u.trim() !== "");

      // Static Offline vCard format (Directly stored in QR code)
      const vcard = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${contactForm.lastName};${contactForm.firstName};;;`,
        `FN:${contactForm.firstName} ${contactForm.lastName}`.trim(),
        contactForm.organization ? `ORG:${contactForm.organization}` : "",
        contactForm.email ? `EMAIL;TYPE=INTERNET,PREF:${contactForm.email}` : "",
        ...activePhones.map((phone, i) => `TEL;TYPE=CELL${i === 0 ? ",PREF" : ""}:${phone.trim()}`),
        (contactForm.street || contactForm.city || contactForm.region || contactForm.postcode || contactForm.country)
          ? `ADR;TYPE=WORK,POSTAL:;;${contactForm.street || ""};${contactForm.city || ""};${contactForm.region || ""};${contactForm.postcode || ""};${contactForm.country || ""}`
          : "",
        ...activeUrls.map(url => `URL:${url.trim()}`),
        "END:VCARD"
      ].filter(Boolean).join("\r\n");

      setQrValue(vcard);
      setGeneratedType("contact");
    }
  };

  // Download QR code image
  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;

    try {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `qrcode_${generatedType}_${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR code:", err);
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">QR</div>
          <h1 className="app-title">Rapids QR</h1>
        </div>
        <p className="app-subtitle">
          Generate premium offline QR codes. Scan to directly save contact information natively on your mobile phone.
        </p>
      </header>

      {/* Main Grid */}
      <main className="layout-grid">
        {/* Left Side: Inputs Form */}
        <section className="glass-card form-section">
          {/* Tab Selection */}
          <div className="tabs">
            <button
              onClick={() => {
                setActiveTab("url");
                setErrorMsg("");
              }}
              className={`tab-btn ${activeTab === "url" ? "active" : ""}`}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              URL / Website Link
            </button>
            <button
              onClick={() => {
                setActiveTab("contact");
                setErrorMsg("");
              }}
              className={`tab-btn ${activeTab === "contact" ? "active" : ""}`}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Contact Info Card
            </button>
          </div>

          <form onSubmit={handleGenerate}>
            {activeTab === "url" ? (
              /* URL INPUT TAB */
              <div className="form-group" style={{ gap: "1rem" }}>
                <h3 className="form-title">Enter Link Details</h3>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={handlePasteUrl}
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.85rem 1.25rem" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ marginRight: "6px" }}>
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    Paste
                  </button>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Enter any website URL. When scanned, it redirects the user directly to the website.
                </p>
              </div>
            ) : (
              /* CONTACT INFO FORM TAB */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <h3 className="form-title">Personal Details</h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      First Name <span className="required-badge">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={contactForm.firstName}
                      onChange={handleContactChange}
                      placeholder="John"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={contactForm.lastName}
                      onChange={handleContactChange}
                      placeholder="Doe"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company / Organization</label>
                    <input
                      type="text"
                      name="organization"
                      value={contactForm.organization}
                      onChange={handleContactChange}
                      placeholder="Acme Corp"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      placeholder="john.doe@example.com"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Multiple Phone Numbers Section */}
                <div className="form-group" style={{ gap: "0.75rem" }}>
                  <label className="form-label">
                    Mobile / Phone Numbers
                  </label>
                  {phones.map((phone, index) => (
                    <div key={index} className="dynamic-row">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(index, e.target.value)}
                        placeholder={index === 0 ? "e.g. +1 (555) 019-2834" : `Phone #${index + 1}`}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      {phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhoneField(index)}
                          className="delete-row-btn"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhoneField}
                    className="add-row-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: "4px" }}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Phone Number
                  </button>
                </div>

                {/* Multiple Website URLs Section */}
                <div className="form-group" style={{ gap: "0.75rem" }}>
                  <label className="form-label">Website URLs</label>
                  {urls.map((url, index) => (
                    <div key={index} className="dynamic-row">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        placeholder={`https://example.com/profile${index > 0 ? index + 1 : ""}`}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrlField(index)}
                          className="delete-row-btn"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addUrlField}
                    className="add-row-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: "4px" }}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add URL
                  </button>
                </div>

                <h3 className="form-title" style={{ marginTop: "1rem" }}>Address Details</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Street Address</label>
                    <input
                      type="text"
                      name="street"
                      value={contactForm.street}
                      onChange={handleContactChange}
                      placeholder="123 Main St"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="city"
                      value={contactForm.city}
                      onChange={handleContactChange}
                      placeholder="San Francisco"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State / Region</label>
                    <input
                      type="text"
                      name="region"
                      value={contactForm.region}
                      onChange={handleContactChange}
                      placeholder="CA"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postcode / ZIP</label>
                    <input
                      type="text"
                      name="postcode"
                      value={contactForm.postcode}
                      onChange={handleContactChange}
                      placeholder="94105"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={contactForm.country}
                      onChange={handleContactChange}
                      placeholder="United States"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  color: "var(--error)",
                  fontSize: "0.9rem",
                  marginTop: "1.5rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ marginRight: "8px", flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn" style={{ width: "100%" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ marginRight: "6px" }}>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              Generate QR Code
            </button>
          </form>
        </section>

        {/* Right Side: Generated Output Preview */}
        <section className="glass-card output-section">
          {qrValue ? (
            <div className="qr-wrapper">
              <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>Generated QR Code</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {generatedType === "url"
                  ? "Encoded Link"
                  : "Static Offline vCard (No internet required)"}
              </p>

              <div className="qr-container" ref={qrRef}>
                <QRCodeCanvas
                  value={qrValue}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div style={{ maxWidth: "260px", wordBreak: "break-all", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                <code>
                  {generatedType === "url"
                    ? (qrValue.length > 60 ? qrValue.substring(0, 57) + "..." : qrValue)
                    : `vCard data (${qrValue.split("\n").length} fields)`}
                </code>
              </div>

              <p className="scan-instructions">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Scan with iOS or Android camera app to import contact natively
              </p>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", width: "100%" }}>
                <button onClick={handleDownloadQr} className="btn" style={{ flex: 1, marginTop: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ marginRight: "6px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PNG
                </button>
              </div>
            </div>
          ) : (
            <div className="qr-placeholder">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <rect x="7" y="7" width="3" height="3" />
                <rect x="14" y="7" width="3" height="3" />
                <rect x="7" y="14" width="3" height="3" />
                <rect x="14" y="14" width="3" height="3" />
              </svg>
              <span>Fill details & click Generate</span>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Rapids QR Code Generator. 100% Offline Static QR codes.</p>
      </footer>
    </div>
  );
}
