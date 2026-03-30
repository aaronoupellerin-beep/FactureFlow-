const state = {
  documents: [],
  currentId: null,
  editingExisting: false,
  items: [],
  billing: null,
  documentTheme: "classic",
  currentPage: "documents"
};

const els = {
  type: document.getElementById("type"),
  number: document.getElementById("number"),
  issueDate: document.getElementById("issueDate"),
  dueDate: document.getElementById("dueDate"),
  status: document.getElementById("status"),
  companyName: document.getElementById("companyName"),
  companyEmail: document.getElementById("companyEmail"),
  clientName: document.getElementById("clientName"),
  clientEmail: document.getElementById("clientEmail"),
  title: document.getElementById("title"),
  taxRate: document.getElementById("taxRate"),
  notes: document.getElementById("notes"),
  navDocuments: document.getElementById("nav-documents"),
  navCalculator: document.getElementById("nav-calculator"),
  documentsPage: document.getElementById("documents-page"),
  calculatorPage: document.getElementById("calculator-page"),
  calculatorLock: document.getElementById("calculator-lock"),
  editorPanel: document.getElementById("editor-panel"),
  editorLock: document.getElementById("editor-lock"),
  freeRemainingBadge: document.getElementById("free-remaining-badge"),
  items: document.getElementById("items"),
  historyList: document.getElementById("history-list"),
  historyCount: document.getElementById("history-count"),
  clientList: document.getElementById("client-list"),
  paymentSummary: document.getElementById("payment-summary"),
  premiumKpis: document.getElementById("premium-kpis"),
  deadlineList: document.getElementById("deadline-list"),
  suggestionList: document.getElementById("suggestion-list"),
  billingTitle: document.getElementById("billing-title"),
  billingText: document.getElementById("billing-text"),
  paypalBlock: document.getElementById("paypal-block"),
  paypalHelp: document.getElementById("paypal-help"),
  premiumButton: document.getElementById("premium-button"),
  duplicateButton: document.getElementById("duplicate-button"),
  clearHistoryButton: document.getElementById("clear-history-button"),
  saveNewButton: document.getElementById("save-new-button"),
  copyFollowupQuote: document.getElementById("copy-followup-quote"),
  copyThankYou: document.getElementById("copy-thank-you"),
  copyReminder1: document.getElementById("copy-reminder-1"),
  copyReminder2: document.getElementById("copy-reminder-2"),
  documentBadge: document.getElementById("document-badge"),
  statusBadge: document.getElementById("status-badge"),
  previewType: document.getElementById("preview-type"),
  previewTitle: document.getElementById("preview-title"),
  previewNumber: document.getElementById("preview-number"),
  previewCompanyName: document.getElementById("preview-company-name"),
  previewCompanyEmail: document.getElementById("preview-company-email"),
  previewClientName: document.getElementById("preview-client-name"),
  previewClientEmail: document.getElementById("preview-client-email"),
  previewIssueDate: document.getElementById("preview-issue-date"),
  previewDueDate: document.getElementById("preview-due-date"),
  previewItems: document.getElementById("preview-items"),
  previewSubtotal: document.getElementById("preview-subtotal"),
  previewTax: document.getElementById("preview-tax"),
  previewTotal: document.getElementById("preview-total"),
  previewNotes: document.getElementById("preview-notes"),
  printableDocument: document.getElementById("printable-document"),
  activeThemeLabel: document.getElementById("active-theme-label"),
  calcServiceName: document.getElementById("calc-service-name"),
  calcDays: document.getElementById("calc-days"),
  calcDailyRate: document.getElementById("calc-daily-rate"),
  calcDirectCost: document.getElementById("calc-direct-cost"),
  calcExtraCost: document.getElementById("calc-extra-cost"),
  calcMargin: document.getElementById("calc-margin"),
  calcDiscount: document.getElementById("calc-discount"),
  calcTax: document.getElementById("calc-tax"),
  runCalculator: document.getElementById("run-calculator"),
  sendToDocument: document.getElementById("send-to-document"),
  calculatorResults: document.getElementById("calculator-results")
};

const money = (value) => `${Number(value || 0).toFixed(2)} EUR`;
const isPremiumActive = () => Boolean(state.billing?.premium);
const premiumThemes = new Set(["sunset", "forest", "midnight"]);

const renderPage = () => {
  const showDocuments = state.currentPage === "documents";
  els.documentsPage.classList.toggle("hidden", !showDocuments);
  els.calculatorPage.classList.toggle("hidden", showDocuments);
  els.navDocuments.className = showDocuments ? "primary-button" : "ghost-button";
  els.navCalculator.className = showDocuments ? "ghost-button" : "primary-button";

  const premiumCalculator = isPremiumActive();
  els.calculatorLock.classList.toggle("hidden", premiumCalculator || showDocuments);
  document.querySelector(".calculator-grid")?.classList.toggle("hidden", !premiumCalculator || showDocuments);
};

const computeTotals = () => {
  const subtotal = state.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const tax = subtotal * (Number(els.taxRate.value || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
};

const currentPayload = () => ({
  type: els.type.value,
  number: els.number.value.trim(),
  issueDate: els.issueDate.value,
  dueDate: els.dueDate.value,
  status: els.status.value,
  documentTheme: state.documentTheme,
  title: els.title.value.trim(),
  taxRate: Number(els.taxRate.value || 0),
  notes: els.notes.value.trim(),
  company: {
    name: els.companyName.value.trim(),
    email: els.companyEmail.value.trim()
  },
  client: {
    name: els.clientName.value.trim(),
    email: els.clientEmail.value.trim()
  },
  items: state.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0)
  }))
});

const addLine = (item = { description: "", quantity: 1, unitPrice: 0 }) => {
  state.items.push(item);
  renderItems();
  renderPreview();
};

const removeLine = (index) => {
  state.items.splice(index, 1);
  renderItems();
  renderPreview();
};

const renderItems = () => {
  els.items.innerHTML = "";
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <label>Description<input data-index="${index}" data-field="description" value="${item.description ?? ""}" /></label>
      <label>Qte<input data-index="${index}" data-field="quantity" type="number" min="1" value="${item.quantity ?? 1}" /></label>
      <label>PU<input data-index="${index}" data-field="unitPrice" type="number" min="0" step="0.01" value="${item.unitPrice ?? 0}" /></label>
      <button class="danger-button" data-remove="${index}" type="button">X</button>
    `;
    els.items.appendChild(row);
  });

  els.items.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index);
      const field = event.target.dataset.field;
      state.items[index][field] = event.target.value;
      renderPreview();
    });
  });

  els.items.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeLine(Number(button.dataset.remove)));
  });
};

const renderPreview = () => {
  const payload = currentPayload();
  const totals = computeTotals();

  els.documentBadge.textContent = payload.type === "invoice" ? "Facture" : "Devis";
  els.statusBadge.textContent = payload.status === "paid" ? "Paye" : payload.status === "issued" ? "Envoye" : "Brouillon";
  els.previewType.textContent = payload.type === "invoice" ? "Facture" : "Devis";
  els.previewTitle.textContent = payload.title || "Titre du document";
  els.previewNumber.textContent = payload.number || "Numero automatique";
  els.previewCompanyName.textContent = payload.company.name || "Votre entreprise";
  els.previewCompanyEmail.textContent = payload.company.email || "email@entreprise.fr";
  els.previewClientName.textContent = payload.client.name || "Nom du client";
  els.previewClientEmail.textContent = payload.client.email || "client@email.com";
  els.previewIssueDate.textContent = `Emission : ${payload.issueDate || "-"}`;
  els.previewDueDate.textContent = `Echeance : ${payload.dueDate || "-"}`;
  els.previewNotes.textContent = payload.notes || "Aucune note.";
  els.printableDocument.className = `document-sheet theme-${payload.documentTheme || "classic"}`;
  els.activeThemeLabel.textContent =
    payload.documentTheme === "sunset"
      ? "Sunset"
      : payload.documentTheme === "forest"
        ? "Forest"
        : payload.documentTheme === "midnight"
          ? "Midnight"
          : "Classique";

  document.querySelectorAll("[data-theme-card]").forEach((card) => {
    const theme = card.dataset.themeCard;
    card.classList.toggle("active-theme", theme === payload.documentTheme);
    card.classList.toggle("locked-theme", premiumThemes.has(theme) && !isPremiumActive());
  });

  document.querySelectorAll("[data-theme-select]").forEach((button) => {
    const locked = premiumThemes.has(button.dataset.themeSelect) && !isPremiumActive();
    button.textContent = locked ? "Premium" : "Selectionner";
  });

  els.previewItems.innerHTML = "";
  payload.items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.description || "-"}</td>
      <td>${item.quantity || 0}</td>
      <td>${money(item.unitPrice)}</td>
      <td>${money((item.quantity || 0) * (item.unitPrice || 0))}</td>
    `;
    els.previewItems.appendChild(tr);
  });

  els.previewSubtotal.textContent = `Sous-total : ${money(totals.subtotal)}`;
  els.previewTax.textContent = `TVA : ${money(totals.tax)}`;
  els.previewTotal.textContent = `Total : ${money(totals.total)}`;
};

const fillForm = (doc) => {
  state.currentId = doc.id;
  state.editingExisting = true;
  state.items = doc.items.map((item) => ({ ...item }));
  els.type.value = doc.type;
  els.number.value = doc.number;
  els.issueDate.value = doc.issueDate || "";
  els.dueDate.value = doc.dueDate || "";
  els.status.value = doc.status || "draft";
  state.documentTheme = doc.documentTheme || "classic";
  els.companyName.value = doc.company?.name || "";
  els.companyEmail.value = doc.company?.email || "";
  els.clientName.value = doc.client?.name || "";
  els.clientEmail.value = doc.client?.email || "";
  els.title.value = doc.title || "";
  els.taxRate.value = doc.taxRate ?? 20;
  els.notes.value = doc.notes || "";
  renderItems();
  renderPreview();
};

const resetForm = () => {
  state.currentId = null;
  state.editingExisting = false;
  state.items = [{ description: "Prestation", quantity: 1, unitPrice: 300 }];
  els.type.value = "quote";
  els.number.value = "";
  els.issueDate.value = new Date().toISOString().slice(0, 10);
  els.dueDate.value = "";
  els.status.value = "draft";
  state.documentTheme = "classic";
  els.companyName.value = "";
  els.companyEmail.value = "";
  els.clientName.value = "";
  els.clientEmail.value = "";
  els.title.value = "Creation site vitrine";
  els.taxRate.value = 20;
  els.notes.value = "Merci pour votre confiance.";
  renderItems();
  renderPreview();
};

const renderPremiumServices = () => {
  if (!isPremiumActive()) {
    els.clientList.innerHTML = '<div class="locked-box">Premium requis pour voir vos meilleurs clients.</div>';
    els.paymentSummary.innerHTML = '<div class="locked-box">Premium requis pour suivre encaissements et impayes.</div>';
    els.premiumKpis.innerHTML = '<div class="locked-box">Premium requis pour afficher les KPI avances.</div>';
    els.deadlineList.innerHTML = '<div class="locked-box">Premium requis pour suivre les echeances.</div>';
    els.suggestionList.innerHTML = '<div class="locked-box">Premium requis pour reutiliser vos prestations depuis l historique.</div>';
    return;
  }

  const clients = new Map();
  let unpaid = 0;
  let paid = 0;
  let quoteCount = 0;
  let invoiceCount = 0;
  let signedQuoteTotal = 0;

  state.documents.forEach((doc) => {
    const key = doc.client?.email || doc.client?.name || "Client";
    const existing = clients.get(key) || { name: doc.client?.name || "Client", total: 0, count: 0 };
    existing.total += Number(doc.totals?.total || 0);
    existing.count += 1;
    clients.set(key, existing);

    if (doc.status === "paid") {
      paid += Number(doc.totals?.total || 0);
    } else if (doc.type === "invoice") {
      unpaid += Number(doc.totals?.total || 0);
    }

    if (doc.type === "quote") {
      quoteCount += 1;
      signedQuoteTotal += Number(doc.totals?.total || 0);
    }

    if (doc.type === "invoice") {
      invoiceCount += 1;
    }
  });

  els.clientList.innerHTML = "";
  const topClients = [...clients.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  if (topClients.length === 0) {
    els.clientList.innerHTML = "<p>Les clients apparaitront ici apres vos premiers documents.</p>";
  } else {
    topClients.forEach((client) => {
      const row = document.createElement("p");
      row.textContent = `${client.name} • ${client.count} doc(s) • ${money(client.total)}`;
      els.clientList.appendChild(row);
    });
  }

  els.paymentSummary.innerHTML = `
    <p>Encaisse : ${money(paid)}</p>
    <p>En attente : ${money(unpaid)}</p>
    <p>Clients suivis : ${clients.size}</p>
  `;

  const averageBasket = state.documents.length
    ? state.documents.reduce((sum, doc) => sum + Number(doc.totals?.total || 0), 0) / state.documents.length
    : 0;
  const conversionRate = quoteCount ? Math.round((invoiceCount / quoteCount) * 100) : 0;

  els.premiumKpis.innerHTML = `
    <p>Panier moyen : ${money(averageBasket)}</p>
    <p>Devis crees : ${quoteCount}</p>
    <p>Factures crees : ${invoiceCount}</p>
    <p>Taux de conversion estime : ${conversionRate}%</p>
    <p>Volume devis : ${money(signedQuoteTotal)}</p>
  `;

  const today = new Date();
  const deadlines = state.documents
    .filter((doc) => doc.type === "invoice" && doc.status !== "paid" && doc.dueDate)
    .map((doc) => {
      const due = new Date(doc.dueDate);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      return { ...doc, diffDays };
    })
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 5);

  els.deadlineList.innerHTML = "";
  if (deadlines.length === 0) {
    els.deadlineList.innerHTML = "<p>Aucune echeance urgente pour le moment.</p>";
  } else {
    deadlines.forEach((doc) => {
      const row = document.createElement("p");
      row.textContent = `${doc.number} • ${doc.client?.name || "Client"} • ${doc.diffDays < 0 ? `${Math.abs(doc.diffDays)} jour(s) de retard` : `${doc.diffDays} jour(s) restants`}`;
      els.deadlineList.appendChild(row);
    });
  }

  const suggestions = new Map();
  state.documents.forEach((doc) => {
    (doc.items || []).forEach((item) => {
      const key = (item.description || "").trim().toLowerCase();
      if (!key) return;
      const existing = suggestions.get(key) || {
        description: item.description,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        count: 0
      };
      existing.count += 1;
      existing.unitPrice = Number(item.unitPrice || existing.unitPrice || 0);
      existing.quantity = Number(item.quantity || existing.quantity || 1);
      suggestions.set(key, existing);
    });
  });

  const topSuggestions = [...suggestions.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  els.suggestionList.innerHTML = "";
  if (topSuggestions.length === 0) {
    els.suggestionList.innerHTML = "<p>Les suggestions apparaitront apres vos premieres prestations enregistrees.</p>";
  } else {
    topSuggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.className = "ghost-button";
      button.type = "button";
      button.textContent = `${suggestion.description} • ${money(suggestion.unitPrice)}`;
      button.addEventListener("click", () => {
        state.items.push({
          description: suggestion.description,
          quantity: suggestion.quantity,
          unitPrice: suggestion.unitPrice
        });
        renderItems();
        renderPreview();
      });
      els.suggestionList.appendChild(button);
    });
  }
};

const getCalculatorValues = () => {
  const days = Number(els.calcDays.value || 0);
  const dailyRate = Number(els.calcDailyRate.value || 0);
  const directCost = Number(els.calcDirectCost.value || 0);
  const extraCost = Number(els.calcExtraCost.value || 0);
  const margin = Number(els.calcMargin.value || 0) / 100;
  const discount = Number(els.calcDiscount.value || 0) / 100;
  const tax = Number(els.calcTax.value || 0) / 100;
  const serviceName = els.calcServiceName.value.trim() || "Prestation";

  const laborValue = days * dailyRate;
  const baseCost = laborValue + directCost + extraCost;
  const recommendedHt = baseCost * (1 + margin);
  const discountedHt = recommendedHt * (1 - discount);
  const totalTtc = discountedHt * (1 + tax);

  return {
    serviceName,
    days,
    dailyRate,
    directCost,
    extraCost,
    laborValue,
    baseCost,
    recommendedHt,
    discountedHt,
    totalTtc,
    marginPercent: margin * 100,
    taxPercent: tax * 100
  };
};

const renderCalculator = () => {
  const values = getCalculatorValues();
  els.calculatorResults.innerHTML = `
    <article class="premium-card">
      <strong>Tarif recommande HT</strong>
      <p>${money(values.recommendedHt)}</p>
    </article>
    <article class="premium-card">
      <strong>Total avec remise et TVA</strong>
      <p>${money(values.totalTtc)}</p>
    </article>
    <article class="premium-card">
      <strong>Valeur du temps vendu</strong>
      <p>${money(values.laborValue)} pour ${values.days} jour(s)</p>
    </article>
    <article class="premium-card">
      <strong>Base de cout</strong>
      <p>${money(values.baseCost)} incluant couts directs et annexes</p>
    </article>
    <article class="premium-card">
      <strong>Marge cible</strong>
      <p>${values.marginPercent.toFixed(0)}%</p>
    </article>
    <article class="premium-card">
      <strong>Conseil pricing</strong>
      <p>${values.discountedHt < values.baseCost ? "Votre remise rogne trop la marge." : "Votre prix reste coherent par rapport aux couts declares."}</p>
    </article>
  `;
};

const loadHistory = async () => {
  const response = await fetch("/api/documents");
  state.documents = await response.json();
  els.historyCount.textContent = state.documents.length;
  els.historyList.innerHTML = "";

  const groups = new Map();
  state.documents.forEach((doc) => {
    const key = doc.client?.name?.trim() || doc.client?.email?.trim() || "Client non renseigne";
    const existing = groups.get(key) || { clientName: key, docs: [], total: 0 };
    existing.docs.push(doc);
    existing.total += Number(doc.totals?.total || 0);
    groups.set(key, existing);
  });

  [...groups.values()].forEach((group) => {
    const wrapper = document.createElement("section");
    wrapper.className = "history-group";
    wrapper.innerHTML = `
      <div class="section-title-row">
        <div>
          <h3>${group.clientName}</h3>
          <p>${group.docs.length} document(s) • ${money(group.total)}</p>
        </div>
      </div>
      <div class="history-documents-row"></div>
    `;

    const row = wrapper.querySelector(".history-documents-row");

    group.docs.forEach((doc) => {
      const card = document.createElement("article");
      card.className = "history-card";
      card.innerHTML = `
        <strong>${doc.number}</strong>
        <p>${doc.type === "invoice" ? "Facture" : "Devis"} • ${doc.status || "draft"}</p>
        <p>${doc.title || "Sans titre"} • Total ${money(doc.totals?.total)}</p>
        <div class="template-actions">
          <button class="ghost-button" data-open="${doc.id}" type="button">Ouvrir</button>
          <button class="ghost-button" data-delete="${doc.id}" type="button">Supprimer</button>
        </div>
      `;
      card.querySelector("[data-open]").addEventListener("click", () => fillForm(doc));
      card.querySelector("[data-delete]").addEventListener("click", async () => {
        const confirmed = window.confirm(`Supprimer ${doc.number} ?`);
        if (!confirmed) return;
        await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
        if (state.currentId === doc.id) resetForm();
        await loadHistory();
        await loadBilling();
      });
      row.appendChild(card);
    });

    els.historyList.appendChild(wrapper);
  });

  renderPremiumServices();
};

const renderBilling = () => {
  if (!state.billing) return;

  const freeRemaining = Math.max(Number(state.billing.remainingFreeDocuments || 0), 0);
  const shouldLockEditor = !state.billing.premium && freeRemaining <= 0;

  els.editorPanel.classList.toggle("trial-panel", !state.billing.premium);
  els.editorPanel.classList.toggle("locked-panel", shouldLockEditor);
  els.editorLock.classList.toggle("hidden", !shouldLockEditor);
  els.freeRemainingBadge.classList.toggle("hidden", state.billing.premium);
  els.freeRemainingBadge.textContent = `${freeRemaining} document(s) gratuit(s) restant(s)`;

  document.querySelectorAll("#editor-panel input, #editor-panel textarea, #editor-panel select, #editor-panel button")
    .forEach((element) => {
      if (element.id === "premium-button") return;
      if (element.id === "new-document-button") return;
      if (element.id === "free-remaining-badge") return;
      const keepEnabled =
        element.id === "print-button" ||
        element.id === "premium-button" ||
        element.id === "new-document-button";
      if (shouldLockEditor && !keepEnabled) {
        element.setAttribute("disabled", "disabled");
      } else {
        element.removeAttribute("disabled");
      }
    });

  if (state.billing.premium) {
    els.billingTitle.textContent = "Premium actif";
    els.billingText.textContent = "Documents illimites, mini CRM, relances et duplication actives.";
    els.paypalBlock.style.display = "grid";
    els.premiumButton.textContent = "Voir PayPal";
    els.premiumButton.disabled = false;
    return;
  }

  els.billingTitle.textContent = "Offre gratuite";
  els.billingText.textContent = `${state.billing.remainingFreeDocuments} document(s) gratuit(s) restant(s) sur ${state.billing.freeLimit}. Premium conseille a 6,99 EUR/mois.`;
  els.paypalBlock.style.display = "grid";
  els.premiumButton.textContent = "Passer premium";
  els.premiumButton.disabled = false;
};

const renderPaypalButton = () => {
  const container = document.getElementById("paypal-button-container");
  if (!window.paypal || !state.billing || state.billing.premium) return;

  container.innerHTML = "";
  window.paypal.Buttons({
    style: {
      shape: "pill",
      color: "gold",
      layout: "vertical",
      label: "subscribe"
    },
    createSubscription(_data, actions) {
      return actions.subscription.create({
        plan_id: state.billing.paypalPlanId
      });
    },
    onApprove(data) {
      return fetch("/api/billing/paypal-approved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionID: data.subscriptionID || null })
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || "Impossible de verifier l abonnement PayPal.");
          }
          return payload;
        })
        .then(() => {
          alert("Abonnement PayPal confirme. Votre acces premium est active.");
          return loadBilling();
        })
        .catch((error) => {
          alert(error.message || "Le paiement a ete approuve mais la verification PayPal a echoue.");
        });
    }
  }).render("#paypal-button-container");
};

const loadBilling = async () => {
  const response = await fetch("/api/billing/status");
  state.billing = await response.json();
  renderBilling();

  const hasPaypalConfig = Boolean(state.billing.paypalClientId && state.billing.paypalPlanId);
  const container = document.getElementById("paypal-button-container");

  if (!hasPaypalConfig) {
    container.innerHTML = "<p>Ajoutez PAYPAL_CLIENT_ID et PAYPAL_PLAN_ID pour afficher le vrai bouton PayPal.</p>";
    els.paypalHelp.textContent = "Pour acceder a PayPal, creez invoice-app/.env avec PAYPAL_CLIENT_ID et PAYPAL_PLAN_ID puis relancez l'application.";
    return;
  }

  els.paypalHelp.textContent = "Cliquez sur le bouton PayPal ci-dessous pour ouvrir la souscription.";

  const currentScript = document.querySelector('script[data-paypal-dynamic="true"]');
  if (!currentScript || currentScript.dataset.clientId !== state.billing.paypalClientId) {
    if (currentScript) currentScript.remove();
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(state.billing.paypalClientId)}&components=buttons&vault=true&intent=subscription`;
    script.dataset.paypalDynamic = "true";
    script.dataset.clientId = state.billing.paypalClientId;
    script.onload = renderPaypalButton;
    document.body.appendChild(script);
  } else if (window.paypal) {
    renderPaypalButton();
  }
};

const saveDocument = async () => {
  if (state.billing && !state.billing.premium && Number(state.billing.remainingFreeDocuments || 0) <= 0) {
    alert("Vous avez utilise tous vos documents gratuits. Passez au premium.");
    return;
  }

  const payload = currentPayload();
  const shouldUpdate = state.editingExisting && state.currentId;
  const url = shouldUpdate ? `/api/documents/${state.currentId}` : "/api/documents";
  const method = shouldUpdate ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const document = await response.json();
  if (!response.ok) {
    alert(document.message || "Impossible d'enregistrer le document.");
    await loadBilling();
    return;
  }

  if (shouldUpdate) {
    fillForm(document);
  } else {
    state.currentId = document.id;
    state.editingExisting = false;
    els.number.value = "";
    renderPreview();
  }
  await loadHistory();
  await loadBilling();
};

const saveAsNewDocument = async () => {
  const previousId = state.currentId;
  const previousEditingState = state.editingExisting;
  const previousNumber = els.number.value;
  state.currentId = null;
  state.editingExisting = false;
  els.number.value = "";
  await saveDocument();
  if (!state.currentId && previousId) {
    state.currentId = previousId;
    state.editingExisting = previousEditingState;
    els.number.value = previousNumber;
  }
};

const convertToInvoice = async () => {
  if (!state.currentId) {
    await saveDocument();
  }

  const response = await fetch(`/api/documents/${state.currentId}/convert`, { method: "POST" });
  const invoice = await response.json();
  if (!response.ok) {
    alert(invoice.message || "Impossible de convertir le document.");
    await loadBilling();
    return;
  }
  fillForm(invoice);
  await loadHistory();
  await loadBilling();
};

const duplicateCurrentDocument = () => {
  if (!isPremiumActive()) {
    alert("Cette fonctionnalite est reservee au premium.");
    return;
  }
  const payload = currentPayload();
  state.currentId = null;
  state.editingExisting = false;
  els.number.value = "";
  els.title.value = `${payload.title || "Document"} (copie)`;
  renderPreview();
};

const sendCalculatorToDocument = () => {
  const values = getCalculatorValues();
  state.currentPage = "documents";
  renderPage();
  els.type.value = "quote";
  els.title.value = values.serviceName;
  state.items.push({
    description: values.serviceName,
    quantity: 1,
    unitPrice: Number(values.discountedHt.toFixed(2))
  });
  renderItems();
  renderPreview();
};

const setTheme = (theme) => {
  if (premiumThemes.has(theme) && !isPremiumActive()) {
    alert("Ce theme est reserve au premium.");
    return;
  }
  state.documentTheme = theme;
  renderPreview();
};

const copyReminder = async (firm = false) => {
  if (!isPremiumActive()) {
    alert("Cette fonctionnalite est reservee au premium.");
    return;
  }
  const clientName = els.clientName.value.trim() || "bonjour";
  const total = els.previewTotal.textContent.replace("Total : ", "");
  const text = firm
    ? `Bonjour ${clientName}, sauf erreur de notre part la facture reste impayee. Merci de proceder au reglement de ${total} dans les meilleurs delais.`
    : `Bonjour ${clientName}, petit rappel concernant votre facture d'un montant de ${total}. N'hesitez pas si vous avez besoin d'un duplicata.`;

  await navigator.clipboard.writeText(text);
  alert("Relance copiee dans le presse-papiers.");
};

const copyMessage = async (kind) => {
  if (!isPremiumActive()) {
    alert("Cette fonctionnalite est reservee au premium.");
    return;
  }
  const clientName = els.clientName.value.trim() || "bonjour";
  const title = els.title.value.trim() || "votre projet";
  const total = els.previewTotal.textContent.replace("Total : ", "");
  const text =
    kind === "quote"
      ? `Bonjour ${clientName}, je reviens vers vous concernant le devis pour ${title}. Je reste disponible si vous souhaitez avancer ou echanger avant validation.`
      : `Bonjour ${clientName}, merci encore pour votre confiance sur ${title}. Le montant final est de ${total}. Je reste disponible pour la suite.`;

  await navigator.clipboard.writeText(text);
  alert("Message copie dans le presse-papiers.");
};

document.getElementById("add-line-button").addEventListener("click", () => addLine());
document.getElementById("new-document-button").addEventListener("click", resetForm);
document.getElementById("save-button").addEventListener("click", saveDocument);
els.saveNewButton.addEventListener("click", saveAsNewDocument);
document.getElementById("print-button").addEventListener("click", () => window.print());
document.getElementById("convert-button").addEventListener("click", convertToInvoice);
els.navDocuments.addEventListener("click", () => {
  state.currentPage = "documents";
  renderPage();
});
els.navCalculator.addEventListener("click", () => {
  if (!isPremiumActive()) {
    state.currentPage = "calculator";
    renderPage();
    return;
  }
  state.currentPage = "calculator";
  renderPage();
});
els.premiumButton.addEventListener("click", () => {
  document.querySelector(".history-panel")?.scrollIntoView({ behavior: "smooth" });
});
els.duplicateButton.addEventListener("click", duplicateCurrentDocument);
els.clearHistoryButton.addEventListener("click", async () => {
  const confirmed = window.confirm("Supprimer tout l'historique ?");
  if (!confirmed) return;
  await fetch("/api/documents", { method: "DELETE" });
  resetForm();
  await loadHistory();
  await loadBilling();
});
els.copyFollowupQuote.addEventListener("click", () => copyMessage("quote"));
els.copyThankYou.addEventListener("click", () => copyMessage("thanks"));
els.copyReminder1.addEventListener("click", () => copyReminder(false));
els.copyReminder2.addEventListener("click", () => copyReminder(true));
els.runCalculator.addEventListener("click", renderCalculator);
els.sendToDocument.addEventListener("click", sendCalculatorToDocument);

document.querySelectorAll("[data-theme-select]").forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeSelect));
});

["calc-service-name", "calc-days", "calc-daily-rate", "calc-direct-cost", "calc-extra-cost", "calc-margin", "calc-discount", "calc-tax"]
  .forEach((id) => {
    document.getElementById(id).addEventListener("input", renderCalculator);
  });

["type", "number", "issueDate", "dueDate", "status", "companyName", "companyEmail", "clientName", "clientEmail", "title", "taxRate", "notes"]
  .forEach((id) => {
    document.getElementById(id).addEventListener("input", renderPreview);
    document.getElementById(id).addEventListener("change", renderPreview);
  });

resetForm();
renderPage();
renderCalculator();
loadHistory();
loadBilling();
