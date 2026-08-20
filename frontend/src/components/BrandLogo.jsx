export function BrandLogo({ className = "h-10 w-10", alt = "Uodegų namai" }) {
  return (
    <img
      src="/logo-house.svg"
      alt={alt}
      className={`shrink-0 object-contain ${className}`}
      width={40}
      height={40}
      decoding="async"
    />
  );
}
