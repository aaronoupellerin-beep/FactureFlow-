import dotenv from "dotenv";

dotenv.config();

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing");
}

const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

const tokenResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "grant_type=client_credentials"
});

if (!tokenResponse.ok) {
  const errorText = await tokenResponse.text();
  throw new Error(`PayPal token error: ${errorText}`);
}

const { access_token: accessToken } = await tokenResponse.json();

const productResponse = await fetch("https://api-m.sandbox.paypal.com/v1/catalogs/products", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "return=representation"
  },
  body: JSON.stringify({
    name: "FactureFlow Premium",
    description: "Abonnement premium mensuel FactureFlow",
    type: "SERVICE",
    category: "SOFTWARE"
  })
});

if (!productResponse.ok) {
  const errorText = await productResponse.text();
  throw new Error(`PayPal product error: ${errorText}`);
}

const product = await productResponse.json();

const planResponse = await fetch("https://api-m.sandbox.paypal.com/v1/billing/plans", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "return=representation"
  },
  body: JSON.stringify({
    product_id: product.id,
    name: "FactureFlow Premium Mensuel",
    description: "Acces premium mensuel FactureFlow",
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "6.99",
            currency_code: "EUR"
          }
        }
      }
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    }
  })
});

if (!planResponse.ok) {
  const errorText = await planResponse.text();
  throw new Error(`PayPal plan error: ${errorText}`);
}

const plan = await planResponse.json();

console.log(JSON.stringify({
  productId: product.id,
  planId: plan.id
}, null, 2));
