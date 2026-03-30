import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 5050);
const storageDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const dataFile = path.join(storageDir, "documents.json");
const settingsFile = path.join(storageDir, "settings.json");
const FREE_DOCUMENT_LIMIT = 3;
const paypalEnv = (process.env.PAYPAL_ENV || "live").toLowerCase();
const paypalApiBase = paypalEnv === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

const readDocuments = () => {
  try {
    const content = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(content || "[]");
  } catch (_error) {
    return [];
  }
};

const writeDocuments = (documents) => {
  fs.writeFileSync(dataFile, JSON.stringify(documents, null, 2), "utf8");
};

const defaultSettings = {
  premium: false,
  activatedAt: null,
  premiumTier: "free",
  paypalSubscriptionId: null,
  paypalSubscriptionStatus: null,
  usedFreeDocuments: 0
};

const readSettings = () => {
  try {
    const content = fs.readFileSync(settingsFile, "utf8");
    return { ...defaultSettings, ...JSON.parse(content || "{}") };
  } catch (_error) {
    return { ...defaultSettings };
  }
};

const writeSettings = (settings) => {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), "utf8");
};

const ensureStorage = () => {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf8");
  }

  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2), "utf8");
  }
};

const hasPaypalServerConfig = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_PLAN_ID);

const getPaypalAccessToken = async () => {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
};

const fetchPaypalSubscription = async (subscriptionId) => {
  const accessToken = await getPaypalAccessToken();
  const response = await fetch(`${paypalApiBase}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`PayPal subscription lookup failed with status ${response.status}`);
  }

  return response.json();
};

const verifyPaypalWebhookSignature = async (headers, body) => {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return false;
  }

  const accessToken = await getPaypalAccessToken();
  const response = await fetch(`${paypalApiBase}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body
    })
  });

  if (!response.ok) {
    throw new Error(`PayPal webhook verification failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.verification_status === "SUCCESS";
};

const activatePremiumFromSubscription = (subscription) => {
  const settings = readSettings();
  settings.premium = true;
  settings.activatedAt = new Date().toISOString();
  settings.premiumTier = "premium";
  settings.paypalSubscriptionId = subscription.id || null;
  settings.paypalSubscriptionStatus = subscription.status || null;
  writeSettings(settings);
  return settings;
};

const deactivatePremiumFromSubscription = (subscription) => {
  const settings = readSettings();
  settings.premium = false;
  settings.premiumTier = "free";
  settings.paypalSubscriptionId = subscription?.id || settings.paypalSubscriptionId || null;
  settings.paypalSubscriptionStatus = subscription?.status || null;
  writeSettings(settings);
  return settings;
};

const computeTotals = (items, taxRate) => {
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const tax = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + tax;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

const nextNumber = (type, documents) => {
  const prefix = type === "invoice" ? "FAC" : "DEV";
  const count = documents.filter((doc) => doc.type === type).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
};

app.post("/api/billing/paypal-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!hasPaypalServerConfig()) {
    return res.status(503).json({ message: "Configuration PayPal serveur incomplete." });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch (_error) {
    return res.status(400).json({ message: "Webhook PayPal invalide." });
  }

  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return res.status(202).json({
      received: true,
      verified: false,
      message: "PAYPAL_WEBHOOK_ID manquant. Webhook pret mais non verifie."
    });
  }

  try {
    const verified = await verifyPaypalWebhookSignature(req.headers, event);
    if (!verified) {
      return res.status(400).json({ message: "Signature webhook PayPal invalide." });
    }

    const subscription = event.resource || {};
    if (subscription.plan_id && subscription.plan_id !== process.env.PAYPAL_PLAN_ID) {
      return res.status(200).json({ received: true, ignored: true });
    }

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
        activatePremiumFromSubscription(subscription);
        break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
        deactivatePremiumFromSubscription(subscription);
        break;
      default:
        break;
    }

    return res.status(200).json({ received: true, verified: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Erreur webhook PayPal." });
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/documents", (_req, res) => {
  res.json(readDocuments().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get("/api/billing/status", (_req, res) => {
  const settings = readSettings();
  const documents = readDocuments();
  const usedFreeDocuments = Number(settings.usedFreeDocuments || 0);

  res.json({
    premium: settings.premium,
    freeLimit: FREE_DOCUMENT_LIMIT,
    usedDocuments: usedFreeDocuments,
    totalDocuments: documents.length,
    remainingFreeDocuments: Math.max(FREE_DOCUMENT_LIMIT - usedFreeDocuments, 0),
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
    paypalPlanId: process.env.PAYPAL_PLAN_ID || "",
    premiumTier: settings.premiumTier || "free",
    subscriptionStatus: settings.paypalSubscriptionStatus || null
  });
});

app.post("/api/documents", (req, res) => {
  const documents = readDocuments();
  const settings = readSettings();
  if (!settings.premium && Number(settings.usedFreeDocuments || 0) >= FREE_DOCUMENT_LIMIT) {
    return res.status(402).json({
      message: "Limite gratuite atteinte. Passez en premium pour creer plus de documents."
    });
  }

  const payload = req.body;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const totals = computeTotals(items, payload.taxRate);

  const document = {
    id: crypto.randomUUID(),
    type: payload.type || "quote",
    number: payload.number || nextNumber(payload.type || "quote", documents),
    company: payload.company || {},
    client: payload.client || {},
    title: payload.title || (payload.type === "invoice" ? "Facture" : "Devis"),
    notes: payload.notes || "",
    issueDate: payload.issueDate || new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate || "",
    taxRate: Number(payload.taxRate || 0),
    items,
    totals,
    status: payload.status || "draft",
    createdAt: new Date().toISOString()
  };

  documents.push(document);
  writeDocuments(documents);
  if (!settings.premium) {
    settings.usedFreeDocuments = Number(settings.usedFreeDocuments || 0) + 1;
    writeSettings(settings);
  }
  res.status(201).json(document);
});

app.put("/api/documents/:id", (req, res) => {
  const documents = readDocuments();
  const index = documents.findIndex((doc) => doc.id === req.params.id);

  if (index < 0) {
    return res.status(404).json({ message: "Document introuvable" });
  }

  const payload = req.body;
  const items = Array.isArray(payload.items) ? payload.items : documents[index].items;

  documents[index] = {
    ...documents[index],
    ...payload,
    items,
    totals: computeTotals(items, payload.taxRate ?? documents[index].taxRate)
  };

  writeDocuments(documents);
  return res.json(documents[index]);
});

app.delete("/api/documents/:id", (req, res) => {
  const documents = readDocuments();
  const filtered = documents.filter((doc) => doc.id !== req.params.id);

  if (filtered.length === documents.length) {
    return res.status(404).json({ message: "Document introuvable" });
  }

  writeDocuments(filtered);
  return res.json({ success: true });
});

app.delete("/api/documents", (_req, res) => {
  writeDocuments([]);
  return res.json({ success: true });
});

app.post("/api/documents/:id/convert", (req, res) => {
  const documents = readDocuments();
  const settings = readSettings();
  if (!settings.premium && Number(settings.usedFreeDocuments || 0) >= FREE_DOCUMENT_LIMIT) {
    return res.status(402).json({
      message: "Limite gratuite atteinte. Passez en premium pour convertir davantage de documents."
    });
  }

  const source = documents.find((doc) => doc.id === req.params.id);

  if (!source) {
    return res.status(404).json({ message: "Document introuvable" });
  }

  const invoice = {
    ...source,
    id: crypto.randomUUID(),
    type: "invoice",
    number: nextNumber("invoice", documents),
    title: "Facture",
    status: "issued",
    createdAt: new Date().toISOString()
  };

  documents.push(invoice);
  writeDocuments(documents);
  if (!settings.premium) {
    settings.usedFreeDocuments = Number(settings.usedFreeDocuments || 0) + 1;
    writeSettings(settings);
  }
  return res.status(201).json(invoice);
});

app.post("/api/billing/activate-demo", (_req, res) => {
  const settings = readSettings();
  settings.premium = true;
  settings.activatedAt = new Date().toISOString();
  settings.premiumTier = "premium";
  writeSettings(settings);

  res.status(201).json({
    premium: true,
    activatedAt: settings.activatedAt
  });
});

app.post("/api/billing/paypal-approved", async (req, res) => {
  const subscriptionId = req.body?.subscriptionID;
  if (!subscriptionId) {
    return res.status(400).json({ message: "subscriptionID manquant." });
  }

  if (!hasPaypalServerConfig()) {
    return res.status(503).json({ message: "Configuration PayPal serveur incomplete." });
  }

  try {
    const subscription = await fetchPaypalSubscription(subscriptionId);

    if (subscription.plan_id !== process.env.PAYPAL_PLAN_ID) {
      return res.status(400).json({ message: "Plan PayPal non autorise." });
    }

    if (!["ACTIVE", "APPROVED"].includes(subscription.status)) {
      return res.status(409).json({
        message: `Abonnement PayPal non actif (${subscription.status || "inconnu"}).`,
        subscriptionStatus: subscription.status || null
      });
    }

    const settings = activatePremiumFromSubscription(subscription);
    return res.status(201).json({
      premium: true,
      activatedAt: settings.activatedAt,
      subscriptionID: settings.paypalSubscriptionId,
      subscriptionStatus: settings.paypalSubscriptionStatus
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Impossible de verifier l'abonnement PayPal." });
  }
});

ensureStorage();

app.listen(port, () => {
  console.log(`Invoice app listening on http://127.0.0.1:${port}`);
});
