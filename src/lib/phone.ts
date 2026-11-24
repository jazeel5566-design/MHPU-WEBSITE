/**
 * Normalise a Maldivian mobile number to the 10-digit international form the
 * SMS gateway expects (e.g. "+960 777-1234" → "9607771234").
 * Returns null for numbers that aren't Maldivian mobiles (7xxxxxx / 9xxxxxx).
 */
export function normaliseMvMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00960")) d = d.slice(2);
  if (d.length === 7) d = "960" + d;
  return /^960[79]\d{6}$/.test(d) ? d : null;
}

/** GSM-7 vs Unicode segment count (Dhivehi/Thaana text uses Unicode: 70 chars per SMS). */
export function smsSegments(text: string) {
  const unicode = /[^\x00-\x7F£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà€^{}\\[~\]|]/.test(text);
  const single = unicode ? 70 : 160, multi = unicode ? 67 : 153;
  const n = text.length;
  return { unicode, chars: n, segments: n === 0 ? 0 : n <= single ? 1 : Math.ceil(n / multi) };
}
