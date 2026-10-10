export type MediaKind = "image" | "video";
export type ExpectedMediaKind = MediaKind | "image-or-video";

const mediaFormats = {
  "image/jpeg": { extension: "jpg", extensions: ["jpg", "jpeg"], kind: "image" },
  "image/png": { extension: "png", extensions: ["png"], kind: "image" },
  "image/webp": { extension: "webp", extensions: ["webp"], kind: "image" },
  "image/avif": { extension: "avif", extensions: ["avif"], kind: "image" },
  "video/mp4": { extension: "mp4", extensions: ["mp4"], kind: "video" },
  "video/webm": { extension: "webm", extensions: ["webm"], kind: "video" },
} as const satisfies Record<
  string,
  { extension: string; extensions: readonly string[]; kind: MediaKind }
>;

const maxImageBytes = 8 * 1024 * 1024;
const maxVideoBytes = 30 * 1024 * 1024;

function fileSignatureMatches(bytes: Uint8Array, mimeType: string): boolean {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  const brands =
    ascii(4, 4) === "ftyp"
      ? [
          ascii(8, 4),
          ...Array.from(
            { length: Math.max(0, Math.floor((bytes.length - 16) / 4)) },
            (_, index) => ascii(16 + index * 4, 4),
          ),
        ]
      : [];

  switch (mimeType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes[0] === 0x89 &&
        ascii(1, 3) === "PNG" &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
    case "image/avif":
      return brands.includes("avif") || brands.includes("avis");
    case "video/mp4":
      return brands.length > 0;
    case "video/webm":
      return (
        bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
      );
    default:
      return false;
  }
}

export async function validateMediaFile(
  file: File,
  expectedKind: ExpectedMediaKind,
): Promise<
  | {
      success: true;
      extension: string;
      mimeType: string;
      kind: MediaKind;
    }
  | { success: false; error: string }
> {
  const mimeType = file.type.trim().toLowerCase();
  const format = Object.hasOwn(mediaFormats, mimeType)
    ? mediaFormats[mimeType as keyof typeof mediaFormats]
    : null;
  if (!format || (expectedKind !== "image-or-video" && format.kind !== expectedKind)) {
    return {
      success: false,
      error:
        expectedKind === "image"
          ? "Selecciona una imagen JPEG, PNG, WebP o AVIF."
          : expectedKind === "video"
            ? "Selecciona un video MP4 o WebM."
            : "Selecciona una imagen o un video en un formato admitido.",
    };
  }

  const maxBytes = format.kind === "image" ? maxImageBytes : maxVideoBytes;
  if (file.size > maxBytes) {
    return {
      success: false,
      error:
        format.kind === "image"
          ? "La imagen supera el límite de 8 MB."
          : "El video supera el límite de 30 MB.",
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !format.extensions.some((allowed) => allowed === extension)) {
    return {
      success: false,
      error: "La extensión del archivo no coincide con su tipo de contenido.",
    };
  }

  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (!fileSignatureMatches(bytes, mimeType)) {
    return {
      success: false,
      error: "El contenido del archivo no coincide con el tipo MIME declarado.",
    };
  }

  return { success: true, extension: format.extension, mimeType, kind: format.kind };
}
