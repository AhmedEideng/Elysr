import { useEffect, useRef, useState } from "react";

/** Shared loading/fallback state for product images in cards and detail views. */
export function useProductImageState(productId: string, image?: string) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset when the product/image changes, but preserve already-cached images.
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
      setLoadedOnce(true);
      setFailed(false);
    } else {
      setLoaded(false);
      setFailed(false);
      setLoadedOnce(false);
    }
  }, [productId, image]);

  function handleLoad() {
    setLoaded(true);
    setLoadedOnce(true);
  }

  function handleError() {
    setFailed(true);
  }

  return { imgRef, loaded, failed, loadedOnce, handleLoad, handleError };
}
