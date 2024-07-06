export function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const remainingSeconds = duration % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  const formattedMinutes =
    minutes > 0 ? `${hours > 0 ? minutes : minutes}` : "0";

  const formattedSeconds = secs < 10 && minutes > 0 ? `0${secs}` : `${secs}`;

  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${minutes}:${formattedSeconds}`;
  }
}
