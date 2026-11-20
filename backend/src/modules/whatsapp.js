import { Router } from "express";
import QRCode from "qrcode";
import { getQr, getIsReady } from "../services/whatsappClient.js";

const router = Router();

// GET /whatsapp/qr — devuelve QR como base64 data URL
router.get("/qr", async (req, res) => {
  if (getIsReady()) {
    return res.json({ status: "connected", qr: null });
  }

  const currentQr = getQr();
  if (!currentQr) {
    return res.json({ status: "waiting", qr: null, message: "QR aún no generado. Esperá unos segundos." });
  }

  const dataUrl = await QRCode.toDataURL(currentQr);
  res.json({ status: "scanning", qr: dataUrl });
});

// GET /whatsapp/status
router.get("/status", (req, res) => {
  res.json({ connected: getIsReady() });
});

export default router;
