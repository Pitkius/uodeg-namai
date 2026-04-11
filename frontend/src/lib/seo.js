import { useEffect } from "react";

const SITE_NAME = "Uodegų namai";
const DEFAULT_ORIGIN = "https://uodegunamai.com";

function setMeta(name, content) {
  if (!content) return;
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setPropertyMeta(property, content) {
  if (!content) return;
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(url) {
  let tag = document.querySelector("link[rel='canonical']");
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", url);
}

export function useSeo({ title, description, path = "/" }) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = pageTitle;

    const canonicalUrl = `${DEFAULT_ORIGIN}${path}`;
    setMeta("description", description);
    setMeta("robots", "index, follow");
    setPropertyMeta("og:title", pageTitle);
    setPropertyMeta("og:description", description);
    setPropertyMeta("og:url", canonicalUrl);
    setMeta("twitter:title", pageTitle);
    setMeta("twitter:description", description);
    setCanonical(canonicalUrl);
  }, [title, description, path]);
}
