// email/helpers.js

/**
 * Detect system / bounce emails
 */
export function isSystemEmail(from = "") {
  const f = from.toLowerCase();
  return (
    f.includes("mailer-daemon") ||
    f.includes("postmaster") ||
    f.includes("bounce") ||
    f.includes("no-reply")
  );
}

/**
 * Extract only the human-written reply
 * Removes headers, DKIM/ARC blocks, quoted replies
 */
export function extractPlainReply(raw = "") {
  if (!raw) return "";

  let text = raw.replace(/\r\n/g, "\n");

  /**
   * Common markers where replies start quoting
   */
  const cutMarkers = [
    "\nOn .* wrote:",
    "\n> ",
    "\nFrom:",
    "\nSent:",
    "\nTo:",
    "\nSubject:",
    "\nReceived:",
    "\nARC-",
    "\nDKIM-",
    "\nAuthentication-Results:",
    "\nMessage-ID:",
    "\nMime-Version:",
    "\nContent-Type:",
  ];

  for (const marker of cutMarkers) {
    const regex = new RegExp(marker, "i");
    const match = text.search(regex);
    if (match !== -1) {
      text = text.substring(0, match);
    }
  }

  /**
   * Remove excessive blank lines
   */
  text = text
    .split("\n")
    .map(line => line.trimEnd())
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  return text.trim();
}
