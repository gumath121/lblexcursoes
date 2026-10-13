```javascript
// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================

const SUPABASE_URL = "https://vguidroxrwujuubflsqr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SivSFlZ6Kb3YNh3ohPHeug_nfvDBxT6";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// ============================================
// ELEMENTOS DA PÁGINA
// ============================================

const excursionsList = document.getElementById("excursions-list");
const excursionsStatus = document.getElementById("excursions-status");
const reservationDialog = document.getElementById("reservation-dialog");
const reservationForm = document.getElementById("reservation-form");

let selectedExcursion = null;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function formatDate(dateValue) {
  if (!dateValue) return "A confirmar";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "A confirmar";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPrice(price) {
  return Number(price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getSafeImageURL(url) {
  if (!url) return "";

  try {
    const parsedURL = new URL(url);

    if (parsedURL.protocol === "https:" || parsedURL.protocol === "http:") {
      return parsedURL.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}

// ============================================
// CARREGAR EXCURSÕES
// ============================================

async function loadExcursions() {
  if (!excursionsList) return;

  excursionsList.innerHTML = "";
  
  if (excursionsStatus) {
    excursionsStatus.textContent = "Carregando excursões...";
  }

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

    if (excursionsStatus) {
      excursionsStatus.textContent =
        "Não foi possível carregar as excursões. Tente novamente mais tarde.";
    }

    return;
  }

  if (!data || data.length === 0) {
    if (excursionsStatus) {
      excursionsStatus.textContent =
        "No momento, não há excursões disponíveis. Volte em breve para conferir as próximas viagens!";
    }

    return;
  }

  if (excursionsStatus) {
    excursionsStatus.textContent = "Confira nossas próximas viagens:";
  }

  data.forEach(function (excursion) {
    const card = document.createElement("article");
    card.className = "excursion-card";

    const imageURL = getSafeImageURL(excursion.image_url);

    const imageHTML = imageURL
      ? `
        <div class="excursion-image">
          <img
            src="${escapeHTML(imageURL)}"
            alt="${escapeHTML(excursion.destination)}"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="excursion-image excursion-image-placeholder">
          <span>LBL EXCURSÕES</span>
        </div>
      `;

    card.innerHTML = `
      ${imageHTML}

      <div class="excursion-card-content">
        <p class="excursion-label">PRÓXIMA VIAGEM</p>

        <h3>${escapeHTML(excursion.title)}</h3>

        <p class="excursion-destination">
          ${escapeHTML(excursion.destination)}
        </p>

        <p class="excursion-description">
          ${escapeHTML(excursion.description || "Entre em contato para saber mais sobre esta viagem.")}
        </p>

        <div class="excursion-details">
          <p>
            <strong>Saída:</strong><br>
            ${escapeHTML(formatDate(excursion.departure_at))}
          </p>

          <p>
            <strong>Local de embarque:</strong><br>
            ${escapeHTML(excursion.departure_location || "A confirmar")}
          </p>

          <p>
            <strong>Retorno previsto:</strong><br>
            ${escapeHTML(formatDate(excursion.return_at))}
          </p>
        </div>

        <div class="excursion-card-footer">
          <div class="excursion-price">
            <span>A partir de</span>
            <strong>${escapeHTML(formatPrice(excursion.price))}</strong>
            <small>por pessoa</small>
          </div>

          <button
            class="btn btn-primary reserve-button"
            type="button"
            data-excursion-id="${escapeHTML(excursion.id)}"
          >
            Reservar
          </button>
        </div>
      </div>
    `;

    excursionsList.appendChild(card);
  });

  excursionsList.querySelectorAll(".reserve-button").forEach(function (button) {
    button.addEventListener("click", function () {
      const excursion = data.find(function (item) {
        return item.id === button.dataset.excursionId;
      });

      if (excursion) {
        openReservationDialog(excursion);
      }
    });
  });
}

// ============================================
// ABRIR FORMULÁRIO DE RESERVA
// ============================================

function openReservationDialog(excursion) {
  selectedExcursion = excursion;

  if (!reservationDialog || !reservationForm) {
    alert("O formulário de reserva não foi encontrado na página.");
    return;
  }

  reservationForm.reset();

  const excursionIdInput = document.getElementById("reservation-excursion-id");

  if (excursionIdInput) {
    excursionIdInput.value = excursion.id;
  }

  const excursionName = document.getElementById("reservation-excursion-name");

  if (excursionName) {
    excursionName.textContent =
      excursion.title + " — " + excursion.destination;
  }

  const message = document.getElementById("reservation-message");

  if (message) {
    message.textContent = "";
    message.className = "";
  }

  if (typeof reservationDialog.showModal === "function") {
    reservationDialog.showModal();
  } else {
    reservationDialog.setAttribute("open", "");
  }
}

// ============================================
// FECHAR FORMULÁRIO DE RESERVA
// ============================================

if (reservationDialog) {
  const closeButtons = reservationDialog.querySelectorAll(
    "[data-close-dialog], .dialog-close, .close-dialog"
  );

  closeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (typeof reservationDialog.close === "function") {
        reservationDialog.close();
      } else {
        reservationDialog.removeAttribute("open");
      }
    });
  });

  reservationDialog.addEventListener("click", function (event) {
    if (event.target === reservationDialog) {
      if (typeof reservationDialog.close === "function") {
        reservationDialog.close();
      } else {
        reservationDialog.removeAttribute("open");
      }
    }
  });
}

// ============================================
// ENVIAR PEDIDO DE RESERVA
// ============================================

if (reservationForm) {
  reservationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("passenger-name");
    const phoneInput = document.getElementById("passenger-phone");
    const seatsInput = document.getElementById("passenger-seats");
    const excursionIdInput = document.getElementById("reservation-excursion-id");
    const submitButton = reservationForm.querySelector(
      'button[type="submit"], input[type="submit"]'
    );
    const message = document.getElementById("reservation-message");

    if (!nameInput || !phoneInput || !seatsInput || !excursionIdInput) {
      if (message) {
        message.textContent =
          "Não foi possível localizar todos os campos do formulário.";
        message.className = "error";
      }

      return;
    }

    const passengerName = nameInput.value.trim();
    const passengerPhone = phoneInput.value.trim();
    const passengerSeats = Number(seatsInput.value);
    const excursionId = excursionIdInput.value;

    if (!passengerName || !passengerPhone) {
      if (message) {
        message.textContent = "Preencha seu nome e telefone.";
        message.className = "error";
      }

      return;
    }

    if (!Number.isInteger(passengerSeats) || passengerSeats < 1 || passengerSeats > 20) {
      if (message) {
        message.textContent = "Selecione uma quantidade válida de lugares.";
        message.className = "error";
      }

      return;
    }

    if (!excursionId) {
      if (message) {
        message.textContent = "Selecione uma excursão antes de continuar.";
        message.className = "error";
      }

      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    if (message) {
      message.textContent = "Enviando seu pedido de reserva...";
      message.className = "";
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
        console.error("Erro na reserva:", error);
        throw new Error(
          error.message || "Não foi possível registrar sua reserva."
        );
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

      if (!result || result.success === false || result.error) {
        throw new Error(
          result && (result.error || result.message)
            ? result.error || result.message
            : "Não foi possível confirmar o recebimento do pedido."
        );
      }

      const reservationCode =
        result.reservation_code ||
        result.code ||
        result.reservationCode ||
        "";

      if (message) {
        message.className = "success";
        message.textContent = reservationCode
          ? "Pedido recebido! Seu código é " + reservationCode +
            ". Sua reserva ficará pendente até a confirmação da agência. Aguarde nosso contato para combinar o pagamento."
          : "Pedido enviado! Sua reserva ficará pendente até a confirmação da agência. Aguarde nosso contato para combinar o pagamento.";
      }

      reservationForm.reset();

      if (submitButton) {
        submitButton.textContent = "Pedido enviado";
      }

    } catch (error) {
      console.error(error);

      if (message) {
        message.className = "error";
        message.textContent =
          error.message ||
          "Ocorreu um erro ao enviar sua reserva. Tente novamente.";
      }

      if (submitButton) {
        submitButton.textContent = "Tentar novamente";
      }

    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        if (submitButton.textContent === "Enviando...") {
          submitButton.textContent = "Solicitar reserva";
        }
      }
    }
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  loadExcursions();
});
```
