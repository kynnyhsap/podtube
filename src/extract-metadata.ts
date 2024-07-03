import { $, spawn } from "bun";

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
  filesize_approx: number;
  url: string;
};

export async function extractMetadata(uri: string) {
  return JSON.parse(
    // -s for simulate
    // -j for json
    // -f ba for best audio

    await $`yt-dlp -f ba -s -j ${uri}`.text(),
  ) as YtDlpMetadataResult;
}
