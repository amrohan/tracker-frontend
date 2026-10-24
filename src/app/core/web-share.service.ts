import { Injectable, inject } from "@angular/core";
import { Notify } from "./notify.service";

export interface SharedContent {
  title?: string;
  text?: string;
  url?: string;
}

const RECENT_TRACKER_KEY = "pt-recent-tracker-id";

@Injectable({ providedIn: "root" })
export class WebShareService {
  private readonly notify = inject(Notify);

  /** Check if the Web Share API is available for outgoing shares. */
  canShare(data?: SharedContent): boolean {
    if (typeof navigator === "undefined" || !navigator.share) {
      return false;
    }
    if (data && typeof navigator.canShare === "function") {
      try {
        return navigator.canShare(data);
      } catch {
        return false;
      }
    }
    return true;
  }

  /** Trigger native Web Share dialog, or fallback to copying link. */
  async share(data: SharedContent): Promise<boolean> {
    const payload = {
      title: data.title || "Tracker",
      text: data.text || undefined,
      url: data.url || (typeof window !== "undefined" ? window.location.href : undefined),
    };

    if (this.canShare(payload)) {
      try {
        await navigator.share(payload);
        return true;
      } catch (err: unknown) {
        // User aborted share sheet or cancelled
        if (err instanceof Error && err.name === "AbortError") {
          return false;
        }
      }
    }

    // Fallback: copy to clipboard
    const textToCopy = payload.url || payload.text || payload.title;
    if (textToCopy && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        this.notify.success("Link copied to clipboard!");
        return true;
      } catch {
        this.notify.error("Could not copy link to clipboard.");
      }
    }
    return false;
  }

  /** Parse and normalize incoming shared query parameters. */
  parseIncomingShare(raw: {
    title?: string | null;
    text?: string | null;
    url?: string | null;
  }): { title: string; text: string; url: string } {
    let title = (raw.title || "").trim();
    let text = (raw.text || "").trim();
    let url = (raw.url || "").trim();

    // If url is not passed directly, look for a URL within the text
    if (!url && text) {
      const match = text.match(/https?:\/\/[^\s]+/i);
      if (match) {
        url = match[0];
        // Strip out the URL from text to keep notes clean
        text = text.replace(url, "").trim();
      }
    }

    // If title is missing but text exists and is short, use text as title
    if (!title && text && text.length <= 80 && !text.includes("\n")) {
      title = text;
      text = "";
    }

    return { title, text, url };
  }

  /** Gets the most recently selected or used tracker ID from local storage. */
  getRecentTrackerId(): string | null {
    try {
      return localStorage.getItem(RECENT_TRACKER_KEY);
    } catch {
      return null;
    }
  }

  /** Persists the most recently selected or used tracker ID. */
  setRecentTrackerId(id: string): void {
    try {
      localStorage.setItem(RECENT_TRACKER_KEY, id);
    } catch {}
  }
}
