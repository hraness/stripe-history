export async function boundedResponseText(
  response: Response,
  options: Readonly<{
    allowErrorStatus?: boolean;
    label: string;
    maxBytes: number;
  }>,
): Promise<string> {
  if (!response.ok && options.allowErrorStatus !== true) {
    await response.body?.cancel();
    throw new Error(`${options.label} returned HTTP ${response.status}`);
  }
  const declaredValue = response.headers.get("content-length");
  if (declaredValue !== null) {
    if (!/^\d+$/u.test(declaredValue)) {
      await response.body?.cancel();
      throw new Error(`${options.label} returned an invalid Content-Length`);
    }
    if (Number(declaredValue) > options.maxBytes) {
      await response.body?.cancel();
      throw new Error(`${options.label} exceeded the configured byte limit`);
    }
  }
  if (response.body === null) return "";

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let bytes = 0;
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > options.maxBytes) {
      await reader.cancel();
      throw new Error(`${options.label} exceeded the configured byte limit`);
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}
