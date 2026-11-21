/* Payment links for My World Flashcards.
   One object, three packages. Replace each PLACEHOLDER with that package's
   Stripe Payment Link (https://buy.stripe.com/...). Do not put secret keys here.
   A value that is still PLACEHOLDER, or is not an https Stripe Payment Link,
   is treated as unset: the pay button stays hidden and the success page asks
   the customer to wait for an emailed payment link.
*/
const MWF_PAYMENTS = {
  packages: {
    sample: {
      id: "sample",
      name: "Sample Preview",
      priceLabel: "$15",
      formValue: "Sample Preview - $15",
      stripePaymentLink: "PLACEHOLDER"
    },
    mini: {
      id: "mini",
      name: "Mini Personalized App",
      priceLabel: "$49",
      formValue: "Mini Personalized App - $49",
      stripePaymentLink: "PLACEHOLDER"
    },
    full: {
      id: "full",
      name: "Full Personalized App",
      priceLabel: "$89",
      formValue: "Full Personalized App - $89",
      stripePaymentLink: "PLACEHOLDER"
    }
  }
};

const MWF_ORDER_STORAGE_KEY = "mwf-pending-order";

function mwfPackages() {
  return Object.values(MWF_PAYMENTS.packages);
}

function mwfFindPackage(packageIdOrFormValue) {
  const needle = String(packageIdOrFormValue || "").trim().toLowerCase();
  if (!needle) {
    return null;
  }

  return (
    mwfPackages().find((pkg) => {
      return (
        pkg.id.toLowerCase() === needle ||
        pkg.formValue.toLowerCase() === needle ||
        pkg.name.toLowerCase() === needle
      );
    }) || null
  );
}

function mwfIsUsableStripeLink(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed || /placeholder/i.test(trimmed)) {
    return false;
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch (error) {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  const host = url.hostname.toLowerCase();
  return host === "buy.stripe.com" || host === "donate.stripe.com";
}

function mwfCreateOrderReference() {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `mwf-${time}-${rand}`;
}

function mwfRememberOrder(order) {
  try {
    sessionStorage.setItem(MWF_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (error) {
    /* The form still posts to Basin if storage is blocked. */
  }
}

function mwfReadOrder() {
  let stored = {};

  try {
    const raw = sessionStorage.getItem(MWF_ORDER_STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : {};
  } catch (error) {
    stored = {};
  }

  if (!stored || typeof stored !== "object") {
    stored = {};
  }

  const params = new URLSearchParams(window.location.search);
  const order = {
    packageId: params.get("package") || stored.packageId || "",
    formValue: stored.formValue || "",
    email: params.get("email") || stored.email || "",
    orderReference: params.get("order") || params.get("orderReference") || stored.orderReference || ""
  };

  if (!order.packageId && !order.formValue && !order.email && !order.orderReference) {
    return null;
  }

  return order;
}

function mwfPaymentUrl(pkg, email, orderReference) {
  const url = new URL(pkg.stripePaymentLink.trim());

  if (email) {
    url.searchParams.set("prefilled_email", email);
  }

  if (orderReference) {
    url.searchParams.set("client_reference_id", orderReference);
  }

  return url.toString();
}

function mwfRenderPaymentStep() {
  const summary = document.getElementById("payment-summary");
  const fallback = document.getElementById("payment-fallback");
  const link = document.getElementById("payment-link");
  const reference = document.getElementById("payment-reference");
  const order = mwfReadOrder();
  const pkg = order ? mwfFindPackage(order.packageId || order.formValue) : null;

  if (summary) {
    if (pkg) {
      summary.textContent = `The last step is paying ${pkg.priceLabel} for the ${pkg.name}. We start the cards after payment.`;
    } else {
      summary.textContent =
        "The last step is paying for the package you selected. We start the cards after payment.";
    }
  }

  if (reference) {
    if (order && order.orderReference) {
      reference.hidden = false;
      reference.textContent = `Order reference: ${order.orderReference}`;
    } else {
      reference.hidden = true;
      reference.textContent = "";
    }
  }

  const liveLink = pkg && mwfIsUsableStripeLink(pkg.stripePaymentLink);

  if (liveLink && link) {
    link.href = mwfPaymentUrl(pkg, order.email, order.orderReference);
    link.hidden = false;
    link.textContent = `Complete payment (${pkg.priceLabel})`;
    if (fallback) {
      fallback.hidden = true;
    }
    return;
  }

  if (link) {
    link.hidden = true;
    link.removeAttribute("href");
  }

  if (!fallback) {
    return;
  }

  fallback.hidden = false;
  const packageBit = pkg ? ` for the ${pkg.name} (${pkg.priceLabel})` : "";
  const emailBit = order && order.email ? ` to ${order.email}` : "";
  const lead = document.createElement("span");
  lead.textContent = `We'll email a payment link${packageBit}${emailBit}. If it does not arrive, write to `;
  const mail = document.createElement("a");
  mail.href = "mailto:hello@myworldflashcards.com";
  mail.textContent = "hello@myworldflashcards.com";
  fallback.replaceChildren(lead, mail, document.createTextNode("."));
}
