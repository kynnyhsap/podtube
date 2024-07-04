import { spawn } from "bun";

type Mp3Metadata = {
  title: string;
  artist: string;
  album: string;
  date: string;
  publisher: string;
};

// -metadata genre="Podcast" -metadata title="${title}" -metadata artist="${artist}" -metadata album="${album}" -metadata publisher="${publisher}" -metadata date="${date}"

export async function updateAudioID3V2Metadata(
  audio: Buffer | ArrayBuffer,
  { title, publisher, album, artist, date }: Mp3Metadata,
) {
  const command = `ffmpeg -i pipe:0 -f wav -metadata genre="Podcast" -metadata title="${title}" -id3v2_version 3 -`;

  const ffmpeg = spawn(command.split(" "), { stdin: "pipe", stdout: "pipe" });

  ffmpeg.stdin.write(audio);
  ffmpeg.stdin.end();

  return ffmpeg.stdout;
}
