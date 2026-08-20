/** Escape text for safe inclusion in HTML email bodies. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function nl2brEscaped(value) {
  return escapeHtml(value).replace(/\r\n|\n|\r/g, "<br/>");
}
