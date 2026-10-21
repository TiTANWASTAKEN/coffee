import { useState } from "react";
import type { ImageAsset } from "@/config/assets";
import { Placeholder } from "./Placeholder";

interface SmartImageProps {
  asset: ImageAsset;
  /** Wrapper classes — the wrapper must have a size (e.g. h-full, aspect-[4/5]). */
  className?: string;
  imgClassName?: string;
  /** Above-the-fold images load eagerly with high priority. */
  priority?: boolean;
  sizes?: string;
  artClassName?: string;
  tagClassName?: string;
  showTag?: boolean;
}

/**
 * Renders the real photograph when `asset.ready` is true, otherwise
 * (or if loading fails) a designed placeholder.
 */
export function SmartImage({
  asset,
  className,
  imgClassName,
  priority = false,
  sizes = "100vw",
  artClassName,
  tagClassName,
  showTag,
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = asset.ready && !failed;

  return (
    <div className={`relative overflow-hidden bg-surface ${className ?? ""}`}>
      {showPhoto ? (
        <picture>
          {asset.mobileSrc && <source media="(max-width: 767px)" srcSet={asset.mobileSrc} />}
          <img
            src={asset.src}
            srcSet={asset.srcSet}
            sizes={asset.srcSet ? sizes : undefined}
            alt={asset.alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full ${asset.fit === "contain" ? "object-contain" : "object-cover"} ${imgClassName ?? ""}`}
          />
        </picture>
      ) : (
        <Placeholder
          {...asset.placeholder}
          alt={asset.alt}
          className={imgClassName}
          artClassName={artClassName}
          tagClassName={tagClassName}
          showTag={showTag}
        />
      )}
    </div>
  );
}
