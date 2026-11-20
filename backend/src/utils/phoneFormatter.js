/**
 * Convierte un número de teléfono paraguayo al formato WhatsApp.
 * "0961123456"   -> "595961123456@c.us"
 * "595961123456" -> "595961123456@c.us"
 */
export function toWhatsAppId(telefono) {
  let cleaned = telefono.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "595" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("595")) {
    cleaned = "595" + cleaned;
  }
  return cleaned + "@c.us";
}
