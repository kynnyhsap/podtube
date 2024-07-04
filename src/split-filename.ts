export function splitFilename(filename: string): {
  id: string;
  ext: string | undefined;
} {
  const match = filename.match(/^(?<id>.+?)(?<ext>\.[^.]*$|$)/);

  if (match && match.groups) {
    const { id, ext } = match.groups;

    return {
      id,
      ext: ext ?? undefined,
    };
  }

  return {
    id: filename,
    ext: undefined,
  };
}
