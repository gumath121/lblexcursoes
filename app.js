
const SUPABASE_URL = "https://vguidroxrwujuubflsqr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SivSFlZ6Kb3YNh3ohPHeug_nfvDBxT6";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const excursionsList = document.getElementById("excursions-list");
const excursionsStatus = document.getElementById("excursions-status");
const reservationDialog = document.getElementById("reservation-dialog");
const reservationForm = document.getElementById("reservation-form");

let excursions = [];
let currentCategory = "todas";
let currentMonth = "todos";
let currentSearch = "";
let currentOrder = "data";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function formatDate(value, includeTime = true) {
  if (!value) return "A confirmar";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "A confirmar";

  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric"
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleString("pt-BR", options);
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function safeImageURL(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}

function showStatus(message, type) {
  if (!excursionsStatus) return;

  excursionsStatus.textContent = message;
  excursionsStatus.className = "status-message";

  if (type) excursionsStatus.classList.add(type);
}

function getCategory(excursion) {
  const text = (
    (excursion.destination || "") + " " +
    (excursion.title || "") + " " +
    (excursion.description || "")
  ).toLowerCase();

  if (/praia|litoral|mar|ubatuba|santos|guarujá|bertioga|ilha bela|caraguá/.test(text)) {
    return "praias";
  }

  if (/compras|brás|25 de março|bom retiro|shopping|santa ifigênia|feira/.test(text)) {
    return "compras";
  }

  if (/parque|hopi hari|wet.?n.?wild|thermas|beto carrero|disney|aquário/.test(text)) {
    return "parques";
  }

  if (/religios|aparecida|santuário|santuario|romaria|igreja|fé/.test(text)) {
    return "religiosas";
  }

  return "passeios";
}

function getMonth(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return String(date.getMonth() + 1).padStart(2, "0") +
    "-" + date.getFullYear();
}

function buildFilters() {
  const host = document.getElementById("excursion-filters");
  if (!host) return;

  const months = [...new Set(
    excursions.map(item => getMonth(item.departure_at)).filter(Boolean)
  )].sort();

  const monthOptions = months.map(value => {
    const [month, year] = value.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    return `<option value="${value}">${escapeHTML(
      label.charAt(0).toUpperCase() + label.slice(1)
    )}</option>`;
  }).join("");

  host.innerHTML = `
    <div class="trip-filter-search">
      <span aria-hidden="true">⌕</span>
      <input
        type="search"
        id="excursion-search"
        placeholder="Buscar por destino..."
        aria-label="Buscar excursões por destino"
      >
    </div>

    <div class="trip-filter-categories" aria-label="Categorias de excursões">
      <button type="button" class="trip-filter-chip active" data-category="todas">Todas</button>
      <button type="button" class="trip-filter-chip" data-category="praias">🏖 Praias</button>
      <button type="button" class="trip-filter-chip" data-category="compras">🛍 Compras</button>
      <button type="button" class="trip-filter-chip" data-category="parques">🎡 Parques</button>
      <button type="button" class="trip-filter-chip" data-category="religiosas">🙏 Religiosas</button>
      <button type="button" class="trip-filter-chip" data-category="passeios">🚌 Outros passeios</button>
    </div>

    <div class="trip-filter-selects">
      <label>
        <span>Data da viagem</span>
        <select id="excursion-month">
          <option value="todos">Todos os meses</option>
          ${monthOptions}
        </select>
      </label>

      <label>
        <span>Ordenar por</span>
        <select id="excursion-order">
          <option value="data">Data mais próxima</option>
          <option value="preco">Menor preço</option>
          <option value="preco-desc">Maior preço</option>
        </select>
      </label>
    </div>
  `;

  host.querySelector("#excursion-search").addEventListener("input", event => {
    currentSearch = event.target.value.trim().toLocaleLowerCase("pt-BR");
    applyFilters();
  });

  host.querySelector("#excursion-month").addEventListener("change", event => {
    currentMonth = event.target.value;
    applyFilters();
  });

  host.querySelector("#excursion-order").addEventListener("change", event => {
    currentOrder = event.target.value;
    applyFilters();
  });

  host.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;

      host.querySelectorAll("[data-category]").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      applyFilters();
    });
  });
}

function applyFilters() {
  let filtered = excursions.filter(excursion => {
    const searchText = [
      excursion.title,
      excursion.destination,
      excursion.description,
      excursion.departure_location
    ].join(" ").toLocaleLowerCase("pt-BR");

    const matchesSearch = !currentSearch || searchText.includes(currentSearch);
    const matchesCategory =
      currentCategory === "todas" || getCategory(excursion) === currentCategory;
    const matchesMonth =
      currentMonth === "todos" || getMonth(excursion.departure_at) === currentMonth;

    return matchesSearch && matchesCategory && matchesMonth;
  });

  if (currentOrder === "preco") {
    filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (currentOrder === "preco-desc") {
    filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else {
    filtered.sort((a, b) =>
      new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime()
    );
  }

  renderExcursions(filtered);

  const count = filtered.length;

  if (!count) {
    showStatus("Nenhuma excursão encontrada com esses filtros. Tente outra busca.");
  } else {
    showStatus(
      count === 1 ? "Encontramos 1 excursão para você." :
      `Encontramos ${count} excursões para você.`
    );
  }
}

function renderExcursions(items) {
  if (!excursionsList) return;

  excursionsList.innerHTML = "";

  if (!items.length) {
    excursionsList.innerHTML = `
      <div class="trip-empty-state">
        <span>🚌</span>
        <h3>Nenhuma viagem encontrada</h3>
        <p>Experimente alterar os filtros para descobrir outros destinos.</p>
      </div>
    `;
    return;
  }

  items.forEach(function (excursion) {
    const card = document.createElement("article");
    card.className = "excursion-card trip-card";

    const imageURL = safeImageURL(excursion.image_url);
    const description = excursion.description ||
      "Entre em contato com nossa equipe para saber mais sobre esta viagem.";

    const category = getCategory(excursion);
    const categoryNames = {
      praias: "Praias",
      compras: "Compras",
      parques: "Parques",
      religiosas: "Turismo religioso",
      passeios: "Excursão"
    };

    const imageHTML = imageURL
      ? `<img class="trip-cover" src="${escapeHTML(imageURL)}"
           alt="${escapeHTML(excursion.destination || excursion.title)}"
           loading="lazy">`
      : `<div class="trip-cover trip-cover-placeholder">
           <span>LBL</span>
           <small>SUA PRÓXIMA VIAGEM</small>
         </div>`;

    card.innerHTML = `
      <div class="trip-image-wrap">
        ${imageHTML}
        <span class="trip-category">${escapeHTML(categoryNames[category])}</span>
      </div>

      <div class="excursion-info trip-info">
        <div class="trip-heading">
          <p class="excursion-destination">${escapeHTML(excursion.destination || "")}</p>
          <h3>${escapeHTML(excursion.title || "Próxima excursão")}</h3>
        </div>

        <div class="trip-dates">
          <div class="trip-date-box">
            <span class="trip-date-icon" aria-hidden="true">↗</span>
            <div>
              <small>DATA DE VIAGEM</small>
              <strong>${escapeHTML(formatDate(excursion.departure_at))}</strong>
            </div>
          </div>

          <div class="trip-date-box">
            <span class="trip-date-icon" aria-hidden="true">↩</span>
            <div>
              <small>DATA DE RETORNO</small>
              <strong>${escapeHTML(formatDate(excursion.return_at))}</strong>
            </div>
          </div>
        </div>

        <div class="trip-boarding">
          <span aria-hidden="true">⌖</span>
          <div>
            <small>LOCAL DE EMBARQUE</small>
            <strong>${escapeHTML(excursion.departure_location || "A confirmar")}</strong>
          </div>
        </div>

        <details class="trip-description">
          <summary><span class="trip-plus">+</span> Ver descrição completa</summary>
          <p>${escapeHTML(description)}</p>
        </details>

        <div class="excursion-bottom trip-bottom">
          <div class="excursion-price trip-price">
            <small>Valor por pessoa</small>
            <strong>${escapeHTML(formatPrice(excursion.price))}</strong>
          </div>

          <button
            type="button"
            class="button reserve-button trip-reserve"
            data-excursion-id="${escapeHTML(excursion.id)}"
          >
            Reservar <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    `;

    excursionsList.appendChild(card);
  });

  excursionsList.querySelectorAll(".reserve-button").forEach(function (button) {
    button.addEventListener("click", function () {
      const excursion = excursions.find(function (item) {
        return String(item.id) === button.dataset.excursionId;
      });

      if (excursion) openReservationDialog(excursion);
    });
  });
}

async function loadExcursions() {
  if (!excursionsList) return;

  showStatus("Carregando excursões...");

  try {
    const { data, error } = await supabaseClient
      .from("excursions")
      .select(`
        id,
        title,
        destination,
        description,
        image_url,
        departure_location,
        departure_at,
        return_at,
        price,
        capacity
      `)
      .eq("active", true)
      .gte("departure_at", new Date().toISOString())
      .order("departure_at", { ascending: true });

    if (error) throw error;

    excursions = data || [];

    if (!excursions.length) {
      showStatus("No momento, não há excursões disponíveis. Volte em breve!");
      if (excursionsList) excursionsList.innerHTML = "";
      return;
    }

    buildFilters();
    applyFilters();
  } catch (error) {
    console.error("Erro ao carregar excursões:", error);
    showStatus(
      "Não foi possível carregar as excursões. Atualize a página ou tente novamente.",
      "error"
    );
  }
}

function openReservationDialog(excursion) {
  if (!reservationDialog || !reservationForm) {
    alert("Não foi possível abrir o formulário de reserva.");
    return;
  }

  reservationForm.reset();

  const idInput = document.getElementById("reservation-excursion-id");
  const details = document.getElementById("reservation-details");
  const feedback = document.getElementById("reservation-feedback");
  const submitButton = document.getElementById("reservation-submit");

  if (idInput) idInput.value = excursion.id;

  if (details) {
    details.textContent = excursion.title + " — " + excursion.destination;
  }

  if (feedback) {
    feedback.textContent = "";
    feedback.className = "form-feedback";
  }

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar solicitação ↗";
  }

  if (typeof reservationDialog.showModal === "function") {
    reservationDialog.showModal();
  } else {
    reservationDialog.setAttribute("open", "");
  }
}

if (reservationDialog) {
  const closeButton = document.getElementById("close-dialog");

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      reservationDialog.close();
    });
  }

  reservationDialog.addEventListener("click", function (event) {
    if (event.target === reservationDialog) reservationDialog.close();
  });
}

if (reservationForm) {
  reservationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("passenger-name");
    const phoneInput = document.getElementById("passenger-phone");
    const seatsInput = document.getElementById("passenger-seats");
    const idInput = document.getElementById("reservation-excursion-id");
    const feedback = document.getElementById("reservation-feedback");
    const submitButton = document.getElementById("reservation-submit");

    if (!nameInput || !phoneInput || !seatsInput || !idInput) {
      if (feedback) {
        feedback.textContent = "Não foi possível localizar os campos do formulário.";
        feedback.className = "form-feedback error";
      }
      return;
    }

    const passengerName = nameInput.value.trim();
    const passengerPhone = phoneInput.value.trim();
    const passengerSeats = Number(seatsInput.value);
    const excursionId = idInput.value;

    if (!passengerName || !passengerPhone || !excursionId) {
      if (feedback) {
        feedback.textContent = "Preencha seu nome, telefone e selecione uma excursão.";
        feedback.className = "form-feedback error";
      }
      return;
    }

    if (!Number.isInteger(passengerSeats) || passengerSeats < 1 || passengerSeats > 20) {
      if (feedback) {
        feedback.textContent = "Selecione uma quantidade válida de passageiros.";
        feedback.className = "form-feedback error";
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    if (feedback) {
      feedback.textContent = "Enviando sua solicitação...";
      feedback.className = "form-feedback";
    }

    try {
      const { data, error } = await supabaseClient.rpc("create_reservation", {
        p_excursion_id: excursionId,
        p_passenger_name: passengerName,
        p_passenger_phone: passengerPhone,
        p_seats: passengerSeats
      });

      if (error) throw new Error(error.message || "Não foi possível enviar sua solicitação.");

      let result = Array.isArray(data) ? data[0] : data;

      if (typeof result === "string") {
        try {
          result = JSON.parse(result);
        } catch (parseError) {
          result = { message: result };
        }
      }

      if (result && (result.success === false || result.error)) {
        throw new Error(result.error || result.message || "A reserva não foi aceita.");
      }

      const code = result && (
        result.reservation_code || result.code || result.reservationCode
      );

      if (feedback) {
        feedback.textContent = code
          ? "Solicitação recebida! Código: " + code +
            ". A reserva depende da confirmação da equipe LBL. O pagamento será combinado diretamente com a agência."
          : "Solicitação enviada! A reserva depende da confirmação da equipe LBL. O pagamento será combinado diretamente com a agência.";

        feedback.className = "form-feedback success";
      }

      if (submitButton) submitButton.textContent = "Solicitação enviada";
    } catch (error) {
      console.error("Erro ao enviar reserva:", error);

      if (feedback) {
        feedback.textContent = error.message || "Erro ao enviar a solicitação. Tente novamente.";
        feedback.className = "form-feedback error";
      }

      if (submitButton) submitButton.textContent = "Tentar novamente";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const yearElement = document.getElementById("current-year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

loadExcursions();
