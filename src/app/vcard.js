// Clean-up for text that ends up inside a QR code.
// Text pasted from Contacts, WhatsApp or web pages often carries invisible characters
// (direction marks, zero-width spaces, non-breaking spaces). They don't show in the form,
// but iPhone's camera rejects a contact card containing them ("No usable data found").

const LINE_BREAKS = /[\t\n\r\v\f\u2028\u2029]/g;
const ODD_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
// Control characters, soft hyphen, zero-width & joiner characters, direction marks, BOM
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

/** Normalise pasted text: odd spaces become plain spaces, invisible characters are removed. */
export const cleanText = (value) =>
  (value || "")
    .normalize("NFC")
    .replace(LINE_BREAKS, " ")
    .replace(ODD_SPACES, " ")
    .replace(INVISIBLE, "")
    .replace(/ {2,}/g, " ")
    .trim();

/** Escape a vCard TEXT value (RFC 2426 §4): backslash, comma and semicolon are separators. */
export const escapeText = (value) =>
  cleanText(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");

/** Clean a URL or email: no spaces allowed inside. */
export const cleanAddress = (value) => cleanText(value).replace(/ /g, "");
