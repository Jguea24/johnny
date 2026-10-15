const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export type YouTubeLink = {
  kind: "video" | "playlist" | "video-and-playlist";
  videoId: string | null;
  playlistId: string | null;
  thumbnailUrl: string | null;
};

export function parseYouTubeLink(value: string | null | undefined): YouTubeLink | null {
  const safeUrl = safeHttpUrl(value);
  if (!safeUrl) return null;

  try {
    const url = new URL(safeUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    let videoId: string | null = null;
    if (host === "youtu.be") {
      videoId = segments[0] ?? null;
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (["embed", "shorts", "live", "v"].includes(segments[0] ?? "")) {
      videoId = segments[1] ?? null;
    }

    if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) videoId = null;
    const rawPlaylistId = url.searchParams.get("list");
    const playlistId = rawPlaylistId && /^[A-Za-z0-9_-]{10,80}$/.test(rawPlaylistId)
      ? rawPlaylistId
      : null;
    if (!videoId && !playlistId) return null;

    const kind = videoId && playlistId
      ? "video-and-playlist"
      : videoId
        ? "video"
        : "playlist";
    return {
      kind,
      videoId,
      playlistId,
      thumbnailUrl: videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : null,
    };
  } catch {
    return null;
  }
}
