import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

let qrCode = null;
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ["--no-sandbox"] },
});

client.on("qr", (qr) => {
  qrCode = qr;
  isReady = false;
  console.log("[WhatsApp] QR generado. Escaneá desde GET /whatsapp/qr");
});

client.on("ready", () => {
  qrCode = null;
  isReady = true;
  console.log("[WhatsApp] Cliente conectado y listo.");
});

client.on("disconnected", (reason) => {
  isReady = false;
  console.log("[WhatsApp] Desconectado:", reason);
});

client.initialize();

export function getQr() {
  return qrCode;
}

export function getIsReady() {
  return isReady;
}

export { client };
