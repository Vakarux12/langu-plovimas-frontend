// ============================================================
// CONFIG - change this to your backend URL when deploying
// ============================================================
const API_BASE = "https://langu-plovimas.onrender.com/api";

// All available time slots in a day
const ALL_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];

// Track selected time slot
let selectedTime = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    // Set min date to today
    const dataInput = document.getElementById("data");
    const today = new Date().toISOString().split("T")[0];
    dataInput.min = today;

    // When date changes, fetch available slots
    dataInput.addEventListener("change", () => {
        const date = dataInput.value;
        if (date) fetchAvailableSlots(date);
    });
});

// ============================================================
// FETCH AVAILABLE SLOTS FROM BACKEND
// ============================================================
async function fetchAvailableSlots(date) {
    selectedTime = null;

    // Clear old grid and show loading immediately
    const old = document.getElementById("slotGrid");
    if (old) old.remove();
    const errorMsg = document.querySelector(".slots-error");
    if (errorMsg) errorMsg.remove();

    const loading = document.createElement("p");
    loading.id = "slotsLoading";
    loading.style.cssText = "color:#8a9ab5;font-size:14px;margin-top:8px;";
    loading.textContent = "Kraunama...";
    document.getElementById("data").parentElement.after(loading);

    try {
        const res = await fetch(`${API_BASE}/slots?date=${date}`);
        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        loading.remove();
        renderTimeSlots(data.booked);
    } catch (err) {
        loading.remove();
        showSlotsError();
    }
}

function getMockBooked(date) {
    // Deterministic mock: book some slots based on date
    const day = new Date(date).getDay();
    const patterns = {
        1: ["09:00","11:00","14:00"],
        2: ["08:00","10:00"],
        3: ["11:00","13:00","15:00","16:00"],
        4: ["09:00"],
        5: ["08:00","09:00","10:00","11:00","17:00"],
        6: ["13:00","14:00","15:00"],
        0: [] // Sunday - all free
    };
    return patterns[day] || [];
}

function renderTimeSlots(bookedSlots) {
    const select = document.getElementById("laikas");
    select.parentElement.style.display = "none"; // hide native select

    // Remove old slot grid if exists
    const old = document.getElementById("slotGrid");
    if (old) old.remove();

    const grid = document.createElement("div");
    grid.className = "time-slots";
    grid.id = "slotGrid";

    ALL_SLOTS.forEach(slot => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "time-slot" + (bookedSlots.includes(slot) ? " booked" : "");
        btn.textContent = slot;
        btn.dataset.time = slot;
        btn.disabled = bookedSlots.includes(slot);

        btn.addEventListener("click", () => {
            document.querySelectorAll(".time-slot").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedTime = slot;
        });

        grid.appendChild(btn);
    });

    select.parentElement.after(grid);

    // Add label above grid
    const label = select.parentElement.querySelector("label");
    label.textContent = "Laikas *";
}

function showSlotsError() {
    const msg = document.createElement("p");
    msg.className = "slots-error";
    msg.style.cssText = "color:#e07070;font-size:14px;margin-top:4px;";
    msg.textContent = "Nepavyko gauti laikų. Bandykite vėliau.";
    document.getElementById("data").parentElement.after(msg);
}

// ============================================================
// STEP NAVIGATION
// ============================================================
function goStep(step) {
    if (step === 2 && !validateStep1()) return;
    if (step === 3 && !validateStep2()) return;
    if (step === 3) buildSummary();

    document.querySelectorAll(".form-step").forEach(el => el.classList.add("hidden"));
    document.getElementById("step" + step).classList.remove("hidden");

    document.getElementById("formBox").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ============================================================
// VALIDATION
// ============================================================
function validateStep1() {
    const fields = [
        { id: "vardas", msg: "Įveskite vardą ir pavardę" },
        { id: "telefonas", msg: "Įveskite telefono numerį" },
        { id: "epastas", msg: "Įveskite el. paštą" },
        { id: "adresas", msg: "Įveskite adresą" },
    ];
    return validateFields(fields);
}

function validateStep2() {
    const fields = [
        { id: "paslauga", msg: "Pasirinkite paslaugą" },
        { id: "data", msg: "Pasirinkite datą" },
    ];
    let valid = validateFields(fields);

    if (!selectedTime) {
        const grid = document.getElementById("slotGrid");
        if (grid) {
            grid.style.outline = "1px solid #e05555";
            grid.style.borderRadius = "8px";
            setTimeout(() => {
                grid.style.outline = "";
            }, 2000);
        }
        if (!document.getElementById("data").value) {
            alert("Pirmiausia pasirinkite datą, tada laiką.");
        } else {
            alert("Pasirinkite laiką.");
        }
        valid = false;
    }

    return valid;
}

function validateFields(fields) {
    let valid = true;
    fields.forEach(({ id, msg }) => {
        const el = document.getElementById(id);
        const group = el.closest(".input-group");
        let errMsg = group.querySelector(".error-msg");
        if (!errMsg) {
            errMsg = document.createElement("span");
            errMsg.className = "error-msg";
            group.appendChild(errMsg);
        }

        if (!el.value.trim()) {
            group.classList.add("error");
            errMsg.textContent = msg;
            valid = false;
        } else {
            group.classList.remove("error");
        }

        el.addEventListener("input", () => group.classList.remove("error"), { once: true });
    });
    return valid;
}

// ============================================================
// SUMMARY
// ============================================================
function buildSummary() {
    const paslaugu = {
        "gyvenamasis": "Gyvenamasis namas / butas",
        "biuras": "Biuras / komercinis objektas",
        "po-remonto": "Po remonto valymas"
    };

    const date = document.getElementById("data").value;
    const formattedDate = date ? new Date(date + "T12:00:00").toLocaleDateString("lt-LT", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    }) : "-";

    const rows = [
        ["Vardas", document.getElementById("vardas").value],
        ["Telefonas", document.getElementById("telefonas").value],
        ["El. paštas", document.getElementById("epastas").value],
        ["Adresas", document.getElementById("adresas").value],
        ["Paslauga", paslaugu[document.getElementById("paslauga").value] || "-"],
        ["Data", formattedDate],
        ["Laikas", selectedTime || "-"],
    ];

    const box = document.getElementById("summaryBox");
    box.innerHTML = rows.map(([label, value]) =>
        `<div class="summary-row">
            <span class="summary-label">${label}</span>
            <span class="summary-value">${value}</span>
        </div>`
    ).join("");
}

// ============================================================
// SUBMIT RESERVATION
// ============================================================
async function rezervuoti() {
    const btn = document.querySelector(".btn-submit");
    btn.classList.add("loading");
    btn.disabled = true;

    const payload = {
        vardas: document.getElementById("vardas").value.trim(),
        telefonas: document.getElementById("telefonas").value.trim(),
        epastas: document.getElementById("epastas").value.trim(),
        adresas: document.getElementById("adresas").value.trim(),
        paslauga: document.getElementById("paslauga").value,
        data: document.getElementById("data").value,
        laikas: selectedTime,
        pastabos: document.getElementById("pastabos").value.trim(),
    };

    try {
        // Get reCAPTCHA token
        const recaptchaToken = await grecaptcha.execute("6Lf9SqMsAAAAAG-mQgiFGWyvMYDU0JnTfOW-AwtL", { action: "rezervacija" });
        payload.recaptchaToken = recaptchaToken;

        const res = await fetch(`${API_BASE}/rezervacija`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Server error");

        showSuccessModal(payload);
    } catch (err) {
        alert("Klaida. Bandykite dar kartą arba skambinkite telefonu.");
    } finally {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

// ============================================================
// SUCCESS MODAL
// ============================================================
function showSuccessModal(data) {
    const date = data.data ? new Date(data.data + "T12:00:00").toLocaleDateString("lt-LT", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    }) : data.data;

    document.getElementById("modalText").textContent =
        `Patvirtinimą išsiųsime el. paštu: ${data.epastas}`;

    document.getElementById("modalDetails").innerHTML = `
        <strong style="color:#f7b825;display:block;margin-bottom:8px;">Jūsų rezervacija:</strong>
        📅 ${date}<br>
        🕐 ${data.laikas}<br>
        📍 ${data.adresas}
    `;

    document.getElementById("successModal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("successModal").classList.add("hidden");
    // Reset form
    document.querySelectorAll("input, select, textarea").forEach(el => el.value = "");
    const grid = document.getElementById("slotGrid");
    if (grid) grid.remove();
    selectedTime = null;
    goStep(1);
    document.querySelector(".booking").scrollIntoView({ behavior: "smooth" });
}
