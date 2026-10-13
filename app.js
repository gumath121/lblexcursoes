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

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[char];
  });
}

function formatDate(value) {
  if (!value) return "A confirmar";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "A confirmar";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

  if (type) {
    excursionsStatus.classList.add(type);
  }
}

function renderExcursions(items) {
  if (!excursionsList) return;

  excursionsList.innerHTML = "";

  items.forEach(function (excursion) {
    const card = document.createElement("article");
    card.className = "excursion-card";

    const imageURL = safeImageURL(excursion.image_url);

    let imageHTML;

    if (imageURL) {
      imageHTML = `
        <div class="excursion-image">
          <img
            src="${escapeHTML(imageURL)}"
            alt="${escapeHTML(excursion.destination)}"
            loading="lazy"
            style="width:100%;height:100%;object-fit:cover;"
          >
        </div>
      `;
    } else {
      imageHTML = `
        <div class="excursion-image excursion-image-placeholder">
          <span>LBL</span>
        </div>
      `;
    }

    card.innerHTML = `
      ${imageHTML}

      <div class="excursion-info">
        <p class="excursion-destination">
          ${escapeHTML(excursion.destination)}
        </p>

        <h3>${escapeHTML(excursion.title)}</h3>

        <p class="excursion-description">
          ${escapeHTML(
            excursion.description ||
            "Entre em contato com nossa equipe para saber mais sobre esta viagem."
          )}
        </p>

        <div class="excursion-meta">
          <span><strong>Saída:</strong> ${escapeHTML(formatDate(excursion.departure_at))}</span>
          <span><strong>Embarque:</strong> ${escapeHTML(excursion.departure_location || "A confirmar")}</span>
          <span><strong>Retorno:</strong> ${escapeHTML(formatDate(excursion.return_at))}</span>
        </div>

        <div class="excursion-bottom">
          <div class="excursion-price">
            <small>Valor por pessoa</small>
            <strong>${escapeHTML(formatPrice(excursion.price))}</strong>
          </div>

          <button
            type="button"
            class="button reserve-button"
            data-excursion-id="${escapeHTML(excursion.id)}"
          >
            Reservar ↗
          </button>
        </div>
      </div>
    `;

    excursionsList.appendChild(card);
  });

  excursionsList.querySelectorAll(".reserve-button").forEach(function (button) {
    button.addEventListener("click", function () {
      const excursion = excursions.find(function (item) {
        return item.id === button.dataset.excursionId;
      });

      if (excursion) {
        openReservationDialog(excursion);
      }
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

    if (error) {
      console.error("Erro ao carregar excursões:", error);
      showStatus(
        "Não foi possível carregar as excursões. Atualize a página ou tente novamente.",
        "error"
      );
      return;
    }

    excursions = data || [];

    if (excursions.length === 0) {
      showStatus(
        "No momento, não há excursões disponíveis. Volte em breve para conferir as próximas viagens!"
      );
      return;
    }

    showStatus("Confira nossas próximas viagens:");
    renderExcursions(excursions);
  } catch (error) {
    console.error("Falha inesperada ao carregar excursões:", error);

    showStatus(
      "Ocorreu um erro ao carregar as excursões. Tente novamente mais tarde.",
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

  if (idInput) {
    idInput.value = excursion.id;
  }

  if (details) {
    details.textContent =
      excursion.title + " — " + excursion.destination;
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
    if (event.target === reservationDialog) {
      reservationDialog.close();
    }
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

    if (
      !Number.isInteger(passengerSeats) ||
      passengerSeats < 1 ||
      passengerSeats > 20
    ) {
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
      const { data, error } = await supabaseClient.rpc(
        "create_reservation",
        {
          p_excursion_id: excursionId,
          p_passenger_name: passengerName,
          p_passenger_phone: passengerPhone,
          p_seats: passengerSeats
        }
      );

      if (error) {
        throw new Error(error.message || "Não foi possível enviar sua solicitação.");
      }

      let result = data;

      if (Array.isArray(result)) {
        result = result[0];
      }

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
        result.reservation_code ||
        result.code ||
        result.reservationCode
      );

      if (feedback) {
        feedback.textContent = code
          ? "Solicitação recebida! Código: " + code +
            ". A reserva ainda depende da confirmação da equipe LBL. O pagamento será combinado diretamente com a agência."
          : "Solicitação enviada! A reserva ainda depende da confirmação da equipe LBL. O pagamento será combinado diretamente com a agência.";

        feedback.className = "form-feedback success";
      }

      if (submitButton) {
        submitButton.textContent = "Solicitação enviada";
      }
    } catch (error) {
      console.error("Erro ao enviar reserva:", error);

      if (feedback) {
        feedback.textContent =
          error.message || "Erro ao enviar a solicitação. Tente novamente.";

        feedback.className = "form-feedback error";
      }

      if (submitButton) {
        submitButton.textContent = "Tentar novamente";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

const yearElement = document.getElementById("current-year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

loadExcursions();
