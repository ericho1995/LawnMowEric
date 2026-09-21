// Tries each configured way of delivering a quote request, in order, and
// stops at the first one that confirms delivery. Free form relays go down
// (FormSubmit was unreachable on 22 Sept 2026), so no single one is trusted.
//
// relays: [{ name, enabled, send(data) -> Promise<boolean> }]
// A relay that throws or answers false is skipped, never retried.
export async function sendFirst(relays, data) {
  for (const relay of relays) {
    if (!relay.enabled) continue;
    try {
      if (await relay.send(data)) return { ok: true, via: relay.name };
    } catch (err) {
      /* try the next one */
    }
  }
  return { ok: false, via: null };
}
