import app from './app.js';
import { connectMongo } from './services/fileStorage.js';
import fs from "fs";
import https from "https";

const PORT = process.env.PORT || 3000;

connectMongo().catch(err => console.error('Failed to connect to MongoDB:', err));

const privateKey  = fs.readFileSync("./certs/server.key", "utf8");
const certificate = fs.readFileSync("./certs/server.crt", "utf8");
const ca          = fs.readFileSync("./certs/ca.crt",    "utf8");
const credentials = { key: privateKey, cert: certificate, ca };

console.clear();
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(PORT, () =>
  console.log(`
         )         )            (   (
   (  ( /(   (  ( /(      (     )\\ ))\\ )
   )\\ )\\())  )\\ )\\())     )\\   (()/(()/(
 (((_|(_)\\ (((_|(_)\\   ((((_)(  /(_))(_))
 )\\___ ((_))\\___ ((_)   )\\ _ )\\(_))(_))
((/ __/ _ ((/ __/ _ \\   (_)_\\(_) _ \\_ _|
 | (_| (_) | (_| (_) |   / _ \\ |  _/| |
  \\___\\___/ \\___\\___/   /_/ \\_\\|_| |___|
🚀 Server running on port ${PORT} with HTTPS
`),
);
