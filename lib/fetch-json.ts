/** Reads a JSON reply safely: an empty or broken server reply becomes a readable error. */
export async function readJson<T = Record<string, unknown>>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : ({ error: res.ok ? undefined : `The server didn't answer (error ${res.status}). Please try again.` } as T & { error?: string });
  } catch {
    return { error: `The server sent an unexpected reply (error ${res.status}). Please try again.` } as T & { error?: string };
  }
}
