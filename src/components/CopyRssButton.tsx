"use client";

import { useState } from "react";

export function CopyRssButton() {
  const [copied, setCopied] = useState(false);

  const username = "andrew";

  async function onClick() {
    console.log("Copying rss url to clipboard...");

    await navigator.clipboard.writeText(
      `${window.location.origin}/rss/${username}`,
    );

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <button
      className="cursor-pointer py-2 px-4 rounded bg-red-600"
      onClick={onClick}
    >
      {copied ? "copied!" : "copy rss url"}
    </button>
  );
}
