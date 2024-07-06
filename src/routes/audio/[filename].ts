import type { APIEvent } from "@solidjs/start/server";
import path from "path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, r2client } from "~/r2";

export async function GET({ params, request }: APIEvent) {
  const { filename } = params;

  const { name: id, ext } = path.parse(filename);

  if (!id || (ext && ext !== ".mp3")) {
    return new Response(
      `Invalid audio filename "${filename}". Expected "{videoId}.mp3"`,
      { status: 400 },
    );
  }

  console.log(`Requested audio file for YouTube video "${id}"`);

  const range = request.headers.get("range") ?? undefined;

  const { ContentRange, ContentLength, Body } = await r2client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: id,
      Range: range,
    }),
  );

  if (!Body) {
    return new Response("Audio stream not available", { status: 404 });
  }

  const stream = Body.transformToWebStream();

  const response = new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Length": String(ContentLength),
    },
  });

  if (range) {
    response.headers.set("Content-Range", String(ContentRange));
  }

  return response;
}
