import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import QRCode from "qrcode";

function localAddress() {
  const interfaces = networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal && (address.address.startsWith("192.168.") || address.address.startsWith("10.") || address.address.startsWith("172."))) return address.address;
    }
  }
  return null;
}

const suppliedUrl = process.argv[2];
const address = localAddress();
const phoneUrl = suppliedUrl ?? (address ? `http://${address}:3000/member` : null);

if (!phoneUrl) {
  throw new Error("No local network address was found. Run with a URL: npm run phone:qr -- http://YOUR-IP:3000/member");
}

const destination = resolve("public", "phone-test-qr.png");
await QRCode.toFile(destination, phoneUrl, { width: 640, margin: 2, color: { dark: "#101d36", light: "#f6f4ef" } });
console.log(`Phone test QR created for: ${phoneUrl}`);
console.log(`Open ${destination} on your computer and scan it with your phone.`);
