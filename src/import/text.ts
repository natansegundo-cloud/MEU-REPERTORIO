export async function readTextFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/u, '');
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}
