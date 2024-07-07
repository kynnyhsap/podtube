"use client";

import { extract } from "@/actions/extract";
import { useState } from "react";

export function YouTubeUriInput({ defaultUri }: { defaultUri: string }) {
  const userId = "andrew";

  const [uri, setUri] = useState(defaultUri);

  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    try {
      await extract(uri, userId);
    } catch (error) {
      console.error(error);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex gap-4 items-center justify-center">
      <input
        type="text"
        placeholder="youtube link"
        className="py-2 px-4 rounded text-gray-600"
        value={uri}
        onChange={(e) => {
          setUri(e.target.value);
        }}
      />

      <button
        className="py-2 px-4 rounded bg-red-500 hover:bg-red-500/90 transition-colors"
        onClick={() => add()}
      >
        {adding ? "adding..." : "add"}
      </button>
    </div>
  );
}
