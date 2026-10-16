"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { upload } from "@vercel/blob/client";
import { COUNTRIES, DEFAULT_COUNTRY, getCountry, toInternational } from "./countries";
import AsciiField from "./components/AsciiField";
import AsciiQrIdle from "./components/AsciiQrIdle";
import AsciiWordmark from "./components/AsciiWordmark";

const PHONE_ICON_PROPS = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.75",
  strokeLinecap: "round", strokeLinejoin: "round", width: "15", height: "15"
};

// Phone number types, mapped to vCard TEL TYPE values. Each number also carries an Apple custom
// label (X-ABLabel) so iOS shows exactly `label` — its built-in names are lowercase ("mobile")
// or the raw type ("VOICE"). Android ignores the label and reads the standard TYPE.
const PHONE_TYPES = [
  {
    value: "mobile", label: "Mobile", vcardType: "CELL", placeholder: "98765 43210",
    icon: <svg {...PHONE_ICON_PROPS}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
  },
  {
    value: "phone", label: "Phone", vcardType: "VOICE", placeholder: "22 2345 6789",
    icon: <svg {...PHONE_ICON_PROPS}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
  },
  {
    value: "fax", label: "Fax", vcardType: "FAX", placeholder: "22 2345 6790",
    icon: (
      <svg {...PHONE_ICON_PROPS}>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    )
  }
];

// Stable ids keep each row's DOM (and focus) attached to its number while reordering
let nextPhoneId = 0;
const newPhone = () => ({ id: nextPhoneId++, type: "mobile", countryCode: DEFAULT_COUNTRY, number: "" });

const getPhoneType = (value) => PHONE_TYPES.find((t) => t.value === value) || PHONE_TYPES[0];

// Image mode: originals are uploaded untouched to Vercel Blob (see app/api/upload/route.js)
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // keep in sync with the upload route

const formatBytes = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const Chevron = () => (
  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" width="12" height="12">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Numbered section heading: "01 ── Personal ─────────"
const SectionHead = ({ index, title }) => (
  <div className="section-head">
    <span className="section-index">{index}</span>
    <h3 className="section-title">{title}</h3>
    <span className="section-rule" aria-hidden="true" />
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState("url"); // 'url', 'contact' or 'image'

  // URL Tab State
  const [urlInput, setUrlInput] = useState("");

  // Contact Info Tab State
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    organization: "",
    email: "",
    street: "",
    city: "",
    region: "",
    postcode: "",
    country: ""
  });

  // Multiple Phone Numbers State (Initial state with 1 compulsory empty field)
  const [phones, setPhones] = useState(() => [newPhone()]);
  const [draggingPhoneId, setDraggingPhoneId] = useState(null);
  const draggingPhoneIdRef = useRef(null); // read synchronously in pointermove, before state re-renders
  const phoneListRef = useRef(null);

  // Multiple URLs State (Initial state with 1 empty field)
  const [urls, setUrls] = useState([""]);

  // Image Tab State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // null when idle, 0–100 while uploading
  const previewUrlRef = useRef("");
  const uploadedImageRef = useRef({ file: null, url: "" }); // regenerating the same file reuses its upload
  const imageInputRef = useRef(null);

  // Generated Result State
  const [qrValue, setQrValue] = useState("");
  const [generatedType, setGeneratedType] = useState(""); // 'url', 'contact' or 'image'
  const [errorMsg, setErrorMsg] = useState("");
  const [generationCount, setGenerationCount] = useState(0); // bumps on every successful Generate, even with identical data

  const qrCanvasRef = useRef(null);
  const qrSvgRef = useRef(null);
  const outputRef = useRef(null);

  // On single-column layouts the output sits below the form, so bring it into view
  useEffect(() => {
    if (generationCount && window.matchMedia("(max-width: 960px)").matches) {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [generationCount]);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  // Phone number handlers
  const handlePhoneChange = (index, field, value) => {
    const updated = [...phones];
    updated[index] = { ...updated[index], [field]: value };
    setPhones(updated);
  };

  const addPhoneField = () => {
    setPhones([...phones, newPhone()]);
  };

  const removePhoneField = (index) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  const movePhone = (id, to) => {
    setPhones((prev) => {
      const from = prev.findIndex((p) => p.id === id);
      if (to < 0 || to >= prev.length || from === to) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  };

  // Drag-to-reorder via the grip handle (pointer events cover both mouse and touch)
  const handlePhoneDragStart = (e, id) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingPhoneIdRef.current = id;
    setDraggingPhoneId(id);
  };

  const handlePhoneDragMove = (e, id) => {
    if (draggingPhoneIdRef.current !== id) return;
    const rows = [...phoneListRef.current.querySelectorAll(".phone-row")];
    let target = rows.findIndex((row) => e.clientY < row.getBoundingClientRect().bottom);
    if (target === -1) target = rows.length - 1;
    movePhone(id, target);
  };

  const handlePhoneDragEnd = () => {
    draggingPhoneIdRef.current = null;
    setDraggingPhoneId(null);
  };

  const handlePhoneHandleKeyDown = (e, id, index) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      movePhone(id, index + (e.key === "ArrowUp" ? -1 : 1));
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

  // Image handlers
  const showPreview = (file) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = file ? URL.createObjectURL(file) : "";
    setImagePreview(previewUrlRef.current);
  };

  const selectImage = useCallback((file) => {
    if (!file) return;
    setErrorMsg("");
    if (!IMAGE_TYPES.includes(file.type)) {
      const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
      setErrorMsg(isHeic
        ? "HEIC photos don't open on most Android phones or browsers. Export it as JPEG first."
        : "Use a JPEG, PNG, WebP, GIF or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMsg(`That image is ${formatBytes(file.size)}. The limit is 20 MB.`);
      return;
    }
    showPreview(file);
    setImageFile(file);
  }, []);

  const clearImage = () => {
    showPreview(null);
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    setIsDraggingImage(false);
    selectImage(e.dataTransfer.files?.[0]);
  };

  // Paste an image from the clipboard while the Image tab is open
  useEffect(() => {
    if (activeTab !== "image") return;
    const onPaste = (e) => {
      const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        selectImage(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeTab, selectImage]);

  // Release the preview's object URL on unmount
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrorMsg("");
  };

  // Form submission / QR Generation
  const handleGenerate = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setQrValue("");

    if (activeTab === "url") {
      if (!urlInput.trim()) {
        setErrorMsg("Enter or paste a URL first.");
        return;
      }

      // Ensure URL has protocol
      let finalUrl = urlInput.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }

      setQrValue(finalUrl);
      setGeneratedType("url");
      setGenerationCount((n) => n + 1);
    } else if (activeTab === "image") {
      if (!imageFile) {
        setErrorMsg("Choose an image first.");
        return;
      }

      try {
        let url = uploadedImageRef.current.file === imageFile ? uploadedImageRef.current.url : "";
        if (!url) {
          setUploadProgress(0);
          // Straight from the browser to Vercel Blob, byte-for-byte; the route only issues a token
          const blob = await upload(`images/${imageFile.name.replace(/[^a-z0-9._-]+/gi, "-")}`, imageFile, {
            access: "public",
            handleUploadUrl: "/api/upload",
            multipart: imageFile.size > 8 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
          });
          url = blob.url;
          uploadedImageRef.current = { file: imageFile, url };
        }
        setQrValue(url);
        setGeneratedType("image");
        setGenerationCount((n) => n + 1);
      } catch (err) {
        setErrorMsg(`Upload failed${err?.message ? `: ${err.message}` : ". Check your connection and try again."}`);
      } finally {
        setUploadProgress(null);
      }
    } else {
      // Validate compulsory fields
      if (!contactForm.firstName.trim()) {
        setErrorMsg("First name is required.");
        return;
      }

      // Filter empty entries
      const activePhones = phones.filter(p => p.number.trim() !== "");
      const activeUrls = urls.filter(u => u.trim() !== "");

      // Static Offline vCard format (Directly stored in QR code)
      const vcard = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${contactForm.lastName};${contactForm.firstName};;;`,
        `FN:${contactForm.firstName} ${contactForm.lastName}`.trim(),
        contactForm.organization ? `ORG:${contactForm.organization}` : "",
        contactForm.jobTitle ? `TITLE:${contactForm.jobTitle}` : "",
        contactForm.email ? `EMAIL;TYPE=INTERNET,PREF:${contactForm.email}` : "",
        ...activePhones.flatMap((phone, i) => {
          const phoneType = getPhoneType(phone.type);
          // Group the number with its label ("item1.TEL" + "item1.X-ABLabel") so iOS pairs them
          const group = `item${i + 1}`;
          return [
            `${group}.TEL;TYPE=${phoneType.vcardType}${i === 0 ? ",PREF" : ""}:${toInternational(phone.countryCode, phone.number)}`,
            `${group}.X-ABLabel:${phoneType.label}`
          ];
        }),
        (contactForm.street || contactForm.city || contactForm.region || contactForm.postcode || contactForm.country)
          ? `ADR;TYPE=WORK,POSTAL:;;${contactForm.street || ""};${contactForm.city || ""};${contactForm.region || ""};${contactForm.postcode || ""};${contactForm.country || ""}`
          : "",
        ...activeUrls.map(url => `URL:${url.trim()}`),
        "END:VCARD"
      ].filter(Boolean).join("\r\n");

      setQrValue(vcard);
      setGeneratedType("contact");
      setGenerationCount((n) => n + 1);
    }
  };

  // Download QR code as PNG (from the hidden high-resolution canvas)
  const handleDownloadPng = () => {
    if (!qrCanvasRef.current) return;
    const canvas = qrCanvasRef.current.querySelector("canvas");
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
      console.error("Failed to download QR code as PNG:", err);
    }
  };

  // Download QR code as SVG
  const handleDownloadSvg = () => {
    if (!qrSvgRef.current) return;
    const svgEl = qrSvgRef.current.querySelector("svg");
    if (!svgEl) return;

    try {
      const serializer = new XMLSerializer();
      let svgStr = serializer.serializeToString(svgEl);

      // Ensure proper XML namespace
      if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `qrcode_${generatedType}_${Date.now()}.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code as SVG:", err);
    }
  };

  const payloadBytes = qrValue ? new TextEncoder().encode(qrValue).length : 0;

  return (
    <>
      <AsciiField />

      <div className="shell">
        {/* Top bar */}
        <header className="topbar">
          <span className="topbar-brand">rapids<span className="topbar-slash">/</span>qr</span>
          <span className="topbar-meta">
            <span>v2.0</span>
            <span className="topbar-dot" aria-hidden="true">·</span>
            <span>offline</span>
            <span className="topbar-dot" aria-hidden="true">·</span>
            <span>static</span>
            <span className="topbar-dot hide-sm" aria-hidden="true">·</span>
            <span className="hide-sm">no tracking</span>
          </span>
        </header>

        {/* Hero */}
        <section className="hero">
          <p className="eyebrow">[ qr code generator ]</p>
          <h1 className="hero-title">Rapids QR</h1>
          <p className="hero-sub">
            <span className="prompt" aria-hidden="true">&gt;</span> Static QR codes for links, contact cards &amp; images. Scanned straight into your phone.<span className="cursor" aria-hidden="true" />
          </p>
        </section>

        <main className="workspace">
          {/* Left: input */}
          <section className="panel panel-input">
            <div className="panel-bar">
              <span>┌─ input</span>
              <span>{{ url: "mode: link", contact: "mode: vcard 3.0", image: "mode: image" }[activeTab]}</span>
            </div>

            <div className="tabs" role="tablist">
              <button
                onClick={() => switchTab("url")}
                className={`tab ${activeTab === "url" ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "url"}
              >
                <span className="tab-index">A/</span>
                <span className="tab-name">Link</span>
                <span className="tab-desc">url · website</span>
              </button>
              <button
                onClick={() => switchTab("contact")}
                className={`tab ${activeTab === "contact" ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "contact"}
              >
                <span className="tab-index">B/</span>
                <span className="tab-name">Contact</span>
                <span className="tab-desc">vcard · offline</span>
              </button>
              <button
                onClick={() => switchTab("image")}
                className={`tab ${activeTab === "image" ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "image"}
              >
                <span className="tab-index">C/</span>
                <span className="tab-name">Image</span>
                <span className="tab-desc">upload · photo</span>
              </button>
            </div>

            <form onSubmit={handleGenerate} className="panel-body">
              {activeTab === "url" && (
                /* URL INPUT TAB */
                <div className="form-section">
                  <SectionHead index="01" title="Destination" />
                  <div className="field">
                    <label className="field-label" htmlFor="url-input">Website URL</label>
                    <div className="inline-row">
                      <input
                        id="url-input"
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com"
                        className="input"
                        autoComplete="url"
                      />
                      <button onClick={handlePasteUrl} type="button" className="btn-ghost">
                        Paste
                      </button>
                    </div>
                    <p className="hint">Scanning the code opens this link. https:// is added if you leave it out.</p>
                  </div>
                </div>
              )}

              {activeTab === "contact" && (
                /* CONTACT INFO FORM TAB */
                <>
                  <div className="form-section">
                    <SectionHead index="01" title="Personal" />
                    <div className="grid-2">
                      <div className="field">
                        <label className="field-label" htmlFor="firstName">First name <span className="req">*</span></label>
                        <input id="firstName" type="text" name="firstName" value={contactForm.firstName} onChange={handleContactChange} placeholder="John" className="input" autoComplete="given-name" required />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="lastName">Last name</label>
                        <input id="lastName" type="text" name="lastName" value={contactForm.lastName} onChange={handleContactChange} placeholder="Doe" className="input" autoComplete="family-name" />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="jobTitle">Job title</label>
                        <input id="jobTitle" type="text" name="jobTitle" value={contactForm.jobTitle} onChange={handleContactChange} placeholder="Software Engineer" className="input" autoComplete="organization-title" />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="organization">Company</label>
                        <input id="organization" type="text" name="organization" value={contactForm.organization} onChange={handleContactChange} placeholder="Acme Corp" className="input" autoComplete="organization" />
                      </div>
                      <div className="field span-2">
                        <label className="field-label" htmlFor="email">Email</label>
                        <input id="email" type="email" name="email" value={contactForm.email} onChange={handleContactChange} placeholder="john.doe@example.com" className="input" autoComplete="email" />
                      </div>
                    </div>
                  </div>

                  {/* Multiple Phone Numbers Section */}
                  <div className="form-section">
                    <SectionHead index="02" title="Numbers" />
                    <div className="field" ref={phoneListRef}>
                      {phones.length > 1 && (
                        <p className="hint hint-top">Drag ⠿ to reorder. The first number is saved as primary.</p>
                      )}
                      {phones.map((phone, index) => (
                        <div key={phone.id} className={`row phone-row ${draggingPhoneId === phone.id ? "dragging" : ""}`}>
                          {phones.length > 1 && (
                            <button
                              type="button"
                              className="drag-handle"
                              aria-label={`Reorder phone #${index + 1} (drag, or use arrow keys)`}
                              onPointerDown={(e) => handlePhoneDragStart(e, phone.id)}
                              onPointerMove={(e) => handlePhoneDragMove(e, phone.id)}
                              onPointerUp={handlePhoneDragEnd}
                              onPointerCancel={handlePhoneDragEnd}
                              onKeyDown={(e) => handlePhoneHandleKeyDown(e, phone.id, index)}
                            >
                              ⠿
                            </button>
                          )}
                          <div className="phone-field">
                            <div className="segment phone-type">
                              {getPhoneType(phone.type).icon}
                              <span className="phone-type-label">{getPhoneType(phone.type).label}</span>
                              <Chevron />
                              <select
                                value={phone.type}
                                onChange={(e) => handlePhoneChange(index, "type", e.target.value)}
                                className="segment-select"
                                aria-label={`Phone #${index + 1} type`}
                              >
                                {PHONE_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="segment country-code">
                              <span className="country-flag">{getCountry(phone.countryCode).flag}</span>
                              <span>+{getCountry(phone.countryCode).dial}</span>
                              <Chevron />
                              <select
                                value={phone.countryCode}
                                onChange={(e) => handlePhoneChange(index, "countryCode", e.target.value)}
                                className="segment-select"
                                aria-label={`Phone #${index + 1} country code`}
                              >
                                {COUNTRIES.map((c) => (
                                  <option key={c.iso} value={c.iso}>{c.flag} {c.name} (+{c.dial})</option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="tel"
                              value={phone.number}
                              onChange={(e) => handlePhoneChange(index, "number", e.target.value)}
                              placeholder={getPhoneType(phone.type).placeholder}
                              className="phone-number-input"
                              aria-label={`Phone #${index + 1} number`}
                            />
                          </div>
                          {phones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePhoneField(index)}
                              className="btn-remove"
                              aria-label={`Remove phone #${index + 1}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addPhoneField} className="btn-add">
                        + add number
                      </button>
                    </div>
                  </div>

                  {/* Multiple Website URLs Section */}
                  <div className="form-section">
                    <SectionHead index="03" title="Links" />
                    <div className="field">
                      {urls.map((url, index) => (
                        <div key={index} className="row">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => handleUrlChange(index, e.target.value)}
                            placeholder={`https://example.com/profile${index > 0 ? index + 1 : ""}`}
                            className="input"
                            aria-label={`Website URL #${index + 1}`}
                          />
                          {urls.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeUrlField(index)}
                              className="btn-remove"
                              aria-label={`Remove URL #${index + 1}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addUrlField} className="btn-add">
                        + add link
                      </button>
                    </div>
                  </div>

                  <div className="form-section">
                    <SectionHead index="04" title="Address" />
                    <div className="grid-2">
                      <div className="field span-2">
                        <label className="field-label" htmlFor="street">Street</label>
                        <input id="street" type="text" name="street" value={contactForm.street} onChange={handleContactChange} placeholder="123 Main St" className="input" autoComplete="street-address" />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="city">City</label>
                        <input id="city" type="text" name="city" value={contactForm.city} onChange={handleContactChange} placeholder="Mumbai" className="input" autoComplete="address-level2" />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="region">State / Region</label>
                        <input id="region" type="text" name="region" value={contactForm.region} onChange={handleContactChange} placeholder="Maharashtra" className="input" autoComplete="address-level1" />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="postcode">Postcode</label>
                        <input id="postcode" type="text" name="postcode" value={contactForm.postcode} onChange={handleContactChange} placeholder="400001" className="input" autoComplete="postal-code" />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="country">Country</label>
                        <input id="country" type="text" name="country" value={contactForm.country} onChange={handleContactChange} placeholder="India" className="input" autoComplete="country-name" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "image" && (
                /* IMAGE UPLOAD TAB */
                <div className="form-section">
                  <SectionHead index="01" title="Image" />
                  <div
                    className="field"
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={handleImageDrop}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept={IMAGE_TYPES.join(",")}
                      className="visually-hidden"
                      tabIndex={-1}
                      onChange={(e) => selectImage(e.target.files?.[0])}
                    />
                    {imageFile ? (
                      <div className={`image-preview ${isDraggingImage ? "dragging" : ""}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, nothing for next/image to optimize */}
                        <img src={imagePreview} alt="Selected image" />
                        <div className="image-info">
                          <span className="image-name">{imageFile.name}</span>
                          <span className="image-size">{formatBytes(imageFile.size)} · uploaded at full quality</span>
                          <div className="image-actions">
                            <button type="button" className="btn-ghost" onClick={() => imageInputRef.current?.click()}>Replace</button>
                            <button type="button" className="btn-ghost" onClick={clearImage}>Remove</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`dropzone ${isDraggingImage ? "dragging" : ""}`}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <span className="dropzone-icon" aria-hidden="true">[ + ]</span>
                        <span className="dropzone-title">Upload image</span>
                        <span className="dropzone-sub">click, drop or paste · jpg png webp gif avif · max 20 mb</span>
                      </button>
                    )}
                    <p className="hint">Your image is stored as-is, at full quality, so the code can link to it. Anyone with the code or its link can view it.</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="error" role="alert">
                  <span className="error-tag">err</span>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="btn-generate" disabled={uploadProgress !== null}>
                <span className="btn-generate-label">{uploadProgress !== null ? "Uploading" : "Generate"}</span>
                <span className="btn-generate-kbd">{uploadProgress !== null ? `[ ${uploadProgress}% ]` : "[ enter ↵ ]"}</span>
              </button>
            </form>
          </section>

          {/* Right: output */}
          <aside className="panel panel-output" ref={outputRef}>
            <div className="panel-bar">
              <span>┌─ output</span>
              <span className={qrValue ? "status-ready" : ""}>{qrValue ? "● ready" : "○ idle"}</span>
            </div>

            <div className="panel-body output-body">
              {qrValue ? (
                <div className="result" key={generationCount}>
                  <h2 className="result-title">{{ url: "Your link", contact: "Your card", image: "Your image" }[generatedType]}</h2>
                  <p className="result-meta">
                    {{ url: "url", contact: "vcard 3.0", image: "image link" }[generatedType]} · {payloadBytes} bytes · ecc m
                  </p>

                  {/* Visible QR */}
                  <div className="qr-frame">
                    <span className="qr-corner tl" aria-hidden="true">┌</span>
                    <span className="qr-corner tr" aria-hidden="true">┐</span>
                    <span className="qr-corner bl" aria-hidden="true">└</span>
                    <span className="qr-corner br" aria-hidden="true">┘</span>
                    <div className="qr-paper">
                      <QRCodeSVG value={qrValue} size={208} level="M" marginSize={0} title="Generated QR code" />
                    </div>
                  </div>

                  {/* Hidden high-resolution renders for downloads */}
                  <div ref={qrCanvasRef} hidden>
                    <QRCodeCanvas value={qrValue} size={1024} level="M" marginSize={4} />
                  </div>
                  <div ref={qrSvgRef} hidden>
                    <QRCodeSVG value={qrValue} size={512} level="M" marginSize={4} />
                  </div>

                  <p className="hint scan-hint">
                    {{
                      url: "Point any phone camera at the code to open the link.",
                      contact: "Point an iOS or Android camera at the code to save the contact.",
                      image: "Point any phone camera at the code to open the image.",
                    }[generatedType]}
                  </p>

                  {generatedType === "image" && (
                    <a className="result-link" href={qrValue} target="_blank" rel="noreferrer">
                      open image ↗
                    </a>
                  )}

                  <div className="downloads">
                    <button onClick={handleDownloadSvg} className="btn-solid" type="button">
                      ↓ SVG <span className="btn-note">vector · best for print</span>
                    </button>
                    <button onClick={handleDownloadPng} className="btn-outline" type="button">
                      ↓ PNG <span className="btn-note">high-res</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="idle">
                  <AsciiQrIdle />
                  <p className="idle-caption">
                    awaiting input<span className="cursor" aria-hidden="true" />
                  </p>
                  <p className="hint">Fill in the form and hit Generate. Your code appears here.</p>
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* Footer */}
        <footer className="footer">
          <AsciiWordmark />
          <div className="statusline">
            <span className="statusline-mode">-- static --</span>
            <span>links &amp; contacts never leave your browser</span>
            <span>© {new Date().getFullYear()} rapids qr</span>
          </div>
        </footer>
      </div>
    </>
  );
}
