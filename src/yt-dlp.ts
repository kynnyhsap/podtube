import { $, spawn } from "bun";

// yt-dlp usage and options
// https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#usage-and-options

type YtDlpMetadataResult = {
  id: string;
  title: string;
  channel: string;
  uploader_url: string;
  duration: number;
  duration_string: string;
  thumbnail: string;
  description: string;
  chapters: any;
  webpage_url: string;
  filesize: number;
};

export async function extractMetadata(uri: string) {
  return JSON.parse(
    // -s for simulate
    // -j for json

    await $`yt-dlp -f ba -s -j ${uri}`.text(),
  ) as YtDlpMetadataResult;
}

export async function dowloadAudio(uri: string) {
  const command = `yt-dlp ${uri} -q -f ba -o -`;

  const ytdlp = spawn(command.split(" "), { stderr: "ignore" });

  return ytdlp.stdout;
}
