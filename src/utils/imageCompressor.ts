/**
 * Utility to compress and resize images before converting to Data URL.
 * Prevents exceeding localStorage quota (5MB) and Firestore document limit (1MB).
 */
export function compressImage(
  file: File,
  maxDimension: number = 400,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // SVGs do not need canvas rasterization
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Downscale if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to raw data URL if canvas unavailable
            resolve((e.target?.result as string) || '');
            return;
          }

          // Maintain smooth rendering during downscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Clear canvas (preserves transparency if PNG)
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // For PNGs with transparency, output as PNG, otherwise JPEG for max compression ratio
          const isPng = file.type === 'image/png';
          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputType, quality);

          resolve(dataUrl);
        } catch (err) {
          // Fallback to uncompressed string if canvas fails
          resolve((e.target?.result as string) || '');
        }
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.readAsDataURL(file);
  });
}
