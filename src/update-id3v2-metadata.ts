import { spawn } from "bun";

type Mp3Metadata = {
  title: string;
  artist: string;
  album: string;
  date: string;
  publisher: string;
};

// const command = `ffmpeg -i pipe:0 -f wav -metadata genre=Podcast -metadata title="${title}" -metadata artist="${artist}" -metadata album="${album}" -metadata publisher="${publisher}" -metadata date="${date}" -id3v2_version 3 -`;

export async function updateID3V2Metadata(
  audioBuffer: Buffer,
  headers: Mp3Metadata,
) {
  const metadataArgs = Object.entries(headers)
    .map(([key, value]) => ["-metadata", `${key}="${value}"`])
    .flat();

  console.log({ headers, metadataArgs });

  const ffmpeg = spawn(
    [
      "ffmpeg",
      "-i",
      "pipe:0",
      "-f",
      "wav",
      "-id3v2_version",
      "3",
      ...metadataArgs,
      "-",
    ],
    {
      stdin: "pipe",
      stdout: "pipe",
    },
  );

  ffmpeg.stdin.write(audioBuffer);
  ffmpeg.stdin.end();

  return ffmpeg.stdout;
}
