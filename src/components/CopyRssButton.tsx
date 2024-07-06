"use client";

import { useState } from "react";

export function CopyRssButton() {
  const [copied, setCopied] = useState(false);

  const username = "andrew";

  async function onClick() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/rss/${username}`,
    );

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className="cursor-pointer py-2 px-4 rounded bg-transparent border-2 border-orange-200 hover:bg-orange-200 transition-colors"
      onClick={onClick}
    >
      {copied ? "✅ copied" : "📋 copy rss"}
    </button>
  );
}
