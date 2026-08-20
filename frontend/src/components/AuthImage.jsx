import { useEffect, useState } from "react";
import { api, toProtectedUploadPath } from "../lib/api";

/**
 * Loads a protected upload via authenticated API and shows it as a blob URL.
 */
export function AuthImage({ src, alt, className, version }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl = "";
    setFailed(false);
    setBlobUrl("");

    const path = toProtectedUploadPath(src);
    if (!path) return undefined;

    const url = version ? `${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(version))}` : path;

    (async () => {
      try {
        const res = await api.get(url, { responseType: "blob" });
        if (revoked) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      } catch {
        if (!revoked) setFailed(true);
      }
    })();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, version]);

  if (failed) {
    return <div className={className || "bg-sand-100 text-xs text-navy-800/50"}>Nuotrauka nepasiekiama</div>;
  }
  if (!blobUrl) {
    return <div className={className || "animate-pulse bg-sand-200"} aria-hidden />;
  }
  return <img src={blobUrl} alt={alt || ""} className={className} loading="lazy" />;
}
