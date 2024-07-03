import { spawn } from "bun";

export async function dowloadAudio(uri: string) {
  const command = `yt-dlp ${uri} -q -f ba -o -`;

  const ytdlp = spawn(command.split(" "), { stderr: "ignore" });

  return ytdlp.stdout;
}
