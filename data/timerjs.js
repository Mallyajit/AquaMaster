document.addEventListener("DOMContentLoaded", () => {
  // --- Element Selectors ---
  const addTimerBtn = document.getElementById("add-timer-btn");
  const timerTableBody = document.querySelector("#timer-table tbody");
  const addCo2TimerBtn = document.getElementById("add-co2-timer-btn");
  const co2TimerTableBody = document.querySelector("#co2-timer-table tbody");

  // Correctly select the new elements
  const clock = document.querySelector(".clock");
  const lightPreviewRing = document.querySelector(".light-preview-ring");
  const co2PreviewRing = document.querySelector(".co2-preview-ring");
  const clockFace = document.querySelector(".clock-face");

  let activeInput = null;

  // --- Helper Functions ---
  const timeToMinutes = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const minutesToPercentage = (minutes) => (minutes / 1440) * 100;

  // --- Gradient Update Functions ---
  const updateLightRingGradient = () => {
    const rows = timerTableBody.querySelectorAll("tr");
    const baseColor = "#e9e9e9";
    let gradientPoints = [];

    rows.forEach((row) => {
      const inputs = row.querySelectorAll("input");
      const colorHex = inputs[0].value;
      const fadeIn = timeToMinutes(inputs[1].value);
      const peakStart = timeToMinutes(inputs[2].value);
      const peakEnd = timeToMinutes(inputs[3].value);
      const fadeOut = timeToMinutes(inputs[4].value);

      if (
        fadeIn === null ||
        peakStart === null ||
        peakEnd === null ||
        fadeOut === null
      )
        return;

      // Handle timers crossing midnight
      if (peakStart > peakEnd) {
        // Overnight
        gradientPoints.push({ percent: 0, color: colorHex });
        gradientPoints.push({
          percent: minutesToPercentage(peakEnd),
          color: colorHex,
        });
        gradientPoints.push({
          percent: minutesToPercentage(fadeOut),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(fadeIn),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(peakStart),
          color: colorHex,
        });
        gradientPoints.push({ percent: 100, color: colorHex });
      } else {
        // Same-day
        gradientPoints.push({
          percent: minutesToPercentage(fadeIn),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(peakStart),
          color: colorHex,
        });
        gradientPoints.push({
          percent: minutesToPercentage(peakEnd),
          color: colorHex,
        });
        gradientPoints.push({
          percent: minutesToPercentage(fadeOut),
          color: baseColor,
        });
      }
    });

    if (gradientPoints.length === 0) {
      lightPreviewRing.style.background = baseColor;
      return;
    }

    gradientPoints.sort((a, b) => a.percent - b.percent);
    const stops = gradientPoints
      .map((p) => `${p.color} ${p.percent.toFixed(2)}%`)
      .join(", ");
    const gradientString = `conic-gradient(from 0deg, ${stops})`;

    // **FIX:** Apply the generated gradient to the light preview ring
    lightPreviewRing.style.background = gradientString;
  };

  const updateCo2RingGradient = () => {
    const rows = co2TimerTableBody.querySelectorAll("tr");
    const baseColor = "#e9e9e9";
    const co2Color = "#90ee90"; // Light green for CO2 'on'
    let gradientPoints = [];

    rows.forEach((row) => {
      const inputs = row.querySelectorAll("input");
      const startTime = timeToMinutes(inputs[0].value);
      const endTime = timeToMinutes(inputs[1].value);
      if (startTime === null || endTime === null) return;

      // Handle overnight CO2
      if (startTime > endTime) {
        gradientPoints.push({ percent: 0, color: co2Color });
        gradientPoints.push({
          percent: minutesToPercentage(endTime),
          color: co2Color,
        });
        gradientPoints.push({
          percent: minutesToPercentage(endTime),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(startTime),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(startTime),
          color: co2Color,
        });
        gradientPoints.push({ percent: 100, color: co2Color });
      } else {
        gradientPoints.push({
          percent: minutesToPercentage(startTime),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(startTime),
          color: co2Color,
        });
        gradientPoints.push({
          percent: minutesToPercentage(endTime),
          color: co2Color,
        });
        gradientPoints.push({
          percent: minutesToPercentage(endTime),
          color: baseColor,
        });
      }
    });

    if (gradientPoints.length === 0) {
      co2PreviewRing.style.background = baseColor;
      return;
    }

    gradientPoints.sort((a, b) => a.percent - b.percent);
    let stops = gradientPoints
      .map((p) => `${p.color} ${p.percent.toFixed(2)}%`)
      .join(", ");
    const gradientString = `conic-gradient(from 0deg, ${stops})`;

    // **FIX:** Apply the generated gradient to the CO2 preview ring
    co2PreviewRing.style.background = gradientString;
  };

  // --- Functions to Add Timer Rows ---
  const addTimerRow = () => {
    const row = document.createElement("tr");
    row.innerHTML = `
          <td><input type="color" value="#ffd700"></td>
          <td><input type="text" class="time-input" placeholder="HH:MM"></td>
          <td><input type="text" class="time-input" placeholder="HH:MM"></td>
          <td><input type="text" class="time-input" placeholder="HH:MM"></td>
          <td><input type="text" class="time-input" placeholder="HH:MM"></td>
          <td><button class="delete-btn">✕</button></td>
      `;
    timerTableBody.appendChild(row);

    row.querySelector(".delete-btn").addEventListener("click", () => {
      row.remove();
      updateLightRingGradient();
    });

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", updateLightRingGradient);
      if (input.classList.contains("time-input")) {
        input.addEventListener("focus", (e) => (activeInput = e.target));
      }
    });
    updateLightRingGradient();
  };

  const addCo2TimerRow = () => {
    const row = document.createElement("tr");
    row.innerHTML = `
          <td><input type="text" class="time-input" placeholder="HH:MM"></td>
          <td><input type="text" class="time-input" placeholder="HH:MM"></td>
          <td><button class="delete-btn">✕</button></td>
      `;
    co2TimerTableBody.appendChild(row);

    row.querySelector(".delete-btn").addEventListener("click", () => {
      row.remove();
      updateCo2RingGradient();
    });

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", updateCo2RingGradient);
      if (input.classList.contains("time-input")) {
        input.addEventListener("focus", (e) => (activeInput = e.target));
      }
    });
    updateCo2RingGradient();
  };

  // --- Clock Interaction ---
  clock.addEventListener("click", (e) => {
    if (!activeInput) {
      alert("Please select a time input field first!");
      return;
    }
    const rect = clock.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const totalMinutes = Math.round((angle / 360) * 1440) % 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    activeInput.value = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    activeInput.blur();
    activeInput = null;
  });

  // --- Function to create the hour markers ---
  const createHourMarkers = () => {
    const radius = clockFace.offsetWidth / 2 - 15; // Radius inside the clock face
    for (let i = 0; i < 24; i++) {
      const marker = document.createElement("div");
      marker.classList.add("hour-marker");

      const angle = (i / 24) * 2 * Math.PI - Math.PI / 2; // Start at top
      const x = 50 + (radius / clockFace.offsetWidth) * 100 * Math.cos(angle);
      const y = 50 + (radius / clockFace.offsetHeight) * 100 * Math.sin(angle);

      marker.style.left = `${x}%`;
      marker.style.top = `${y}%`;
      marker.textContent = i;

      if (i % 6 === 0) {
        marker.classList.add("major");
      }

      // **FIX:** Append markers to the clock-face div
      clockFace.appendChild(marker);
    }
  };

  // --- Initial Setup ---
  addTimerBtn.addEventListener("click", addTimerRow);
  addCo2TimerBtn.addEventListener("click", addCo2TimerRow);

  addTimerRow();
  addCo2TimerRow();
  createHourMarkers();
});
