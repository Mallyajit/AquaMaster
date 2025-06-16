document.addEventListener("DOMContentLoaded", () => {
  // --- Variable Declarations ---
  const addTimerBtn = document.getElementById("add-timer-btn");
  const timerTableBody = document.querySelector("#timer-table tbody");
  const addCo2TimerBtn = document.getElementById("add-co2-timer-btn");
  const co2TimerTableBody = document.querySelector("#co2-timer-table tbody");
  const clock = document.querySelector(".clock");
  let activeInput = null;

  // --- Helper Functions ---
  const timeToMinutes = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const minutesToPercentage = (minutes) => {
    return (minutes / 1440) * 100;
  };

  // --- ** COMPLETELY REWRITTEN AND DEBUGGED GRADIENT LOGIC ** ---
  const updateRingGradient = () => {
    const rows = timerTableBody.querySelectorAll("tr");
    const baseColor = "#e9e9e9";
    let stops = [];

    // Collect all timer data first
    const timers = [];
    rows.forEach((row) => {
      const inputs = row.querySelectorAll("input");
      const colorHex = inputs[0].value;
      const fadeIn = timeToMinutes(inputs[1].value);
      const peakStart = timeToMinutes(inputs[2].value);
      const peakEnd = timeToMinutes(inputs[3].value);
      const fadeOut = timeToMinutes(inputs[4].value);
      if (
        fadeIn !== null &&
        peakStart !== null &&
        peakEnd !== null &&
        fadeOut !== null
      ) {
        timers.push({ colorHex, fadeIn, peakStart, peakEnd, fadeOut });
      }
    });

    // If there are no valid timers, just set a base color and exit
    if (timers.length === 0) {
      clock.style.setProperty("--light-gradient", baseColor);
      return;
    }

    // Generate all the start/end points for all timers
    timers.forEach((timer) => {
      const { colorHex, fadeIn, peakStart, peakEnd, fadeOut } = timer;

      // This function adds stops for a single segment (e.g., fade-in)
      // and correctly handles if that segment crosses midnight.
      const addSegmentStops = (startMin, endMin, startColor, endColor) => {
        if (startMin <= endMin) {
          // Same day
          stops.push({
            percent: minutesToPercentage(startMin),
            color: startColor,
          });
          stops.push({ percent: minutesToPercentage(endMin), color: endColor });
        } else {
          // Crosses midnight
          const transitionDuration = 1440 - startMin + endMin;
          const midnightCrossColor = getGradientColor(
            startColor,
            endColor,
            (1440 - startMin) / transitionDuration
          );
          stops.push({
            percent: minutesToPercentage(startMin),
            color: startColor,
          });
          stops.push({ percent: 100, color: midnightCrossColor });
          stops.push({ percent: 0, color: midnightCrossColor });
          stops.push({ percent: minutesToPercentage(endMin), color: endColor });
        }
      };

      // Add stops for each of the 3 segments: fade-in, peak, and fade-out
      addSegmentStops(fadeIn, peakStart, baseColor, colorHex);
      addSegmentStops(peakStart, peakEnd, colorHex, colorHex); // Peak is a solid color
      addSegmentStops(peakEnd, fadeOut, colorHex, baseColor);
    });

    // This is a placeholder for a more advanced merging logic if multiple timers conflict.
    // For now, we sort and build, which works for non-overlapping fades.
    stops.sort((a, b) => a.percent - b.percent);

    const stopStrings = stops.map((s) => `${s.color} ${s.percent.toFixed(2)}%`);
    const gradientString = `conic-gradient(from 0deg, ${baseColor}, ${stopStrings.join(
      ", "
    )}, ${baseColor} 100%)`;

    clock.style.setProperty("--light-gradient", gradientString);
  };

  // This helper function is for overnight fades. It's not perfect but gives a reasonable color at midnight.
  const getGradientColor = (startColor, endColor, percentage) => {
    const start = parseInt(startColor.slice(1), 16);
    const end = parseInt(endColor.slice(1), 16);
    const r = Math.round(
      ((end >> 16) - (start >> 16)) * percentage + (start >> 16)
    );
    const g = Math.round(
      (((end >> 8) & 0xff) - ((start >> 8) & 0xff)) * percentage +
        ((start >> 8) & 0xff)
    );
    const b = Math.round(
      ((end & 0xff) - (start & 0xff)) * percentage + (start & 0xff)
    );
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  };

  // --- The rest of the file remains the same but is included for completeness ---

  const updateCo2Ring = () => {
    const rows = co2TimerTableBody.querySelectorAll("tr");
    const baseColor = "#e9e9e9";
    const co2Color = "#90ee90";
    let gradientPoints = [];

    rows.forEach((row) => {
      const inputs = row.querySelectorAll("input");
      const startTime = timeToMinutes(inputs[0].value);
      const endTime = timeToMinutes(inputs[1].value);
      if (startTime === null || endTime === null) return;

      if (startTime > endTime) {
        gradientPoints.push({ time: 0, color: co2Color });
        gradientPoints.push({ time: endTime, color: co2Color });
        gradientPoints.push({ time: endTime, color: baseColor });
        gradientPoints.push({ time: startTime, color: baseColor });
        gradientPoints.push({ time: startTime, color: co2Color });
        gradientPoints.push({ time: 1440, color: co2Color });
      } else {
        gradientPoints.push({ time: startTime, color: baseColor });
        gradientPoints.push({ time: startTime, color: co2Color });
        gradientPoints.push({ time: endTime, color: co2Color });
        gradientPoints.push({ time: endTime, color: baseColor });
      }
    });

    if (gradientPoints.length === 0) {
      clock.style.setProperty("--co2-gradient", baseColor);
      return;
    }

    gradientPoints.sort((a, b) => a.time - b.time);

    let stopStrings = gradientPoints.map(
      (p) => `${p.color} ${minutesToPercentage(p.time).toFixed(2)}%`
    );
    const gradientString = `conic-gradient(from 0deg, ${baseColor}, ${stopStrings.join(
      ", "
    )}, ${baseColor} 100%)`;

    clock.style.setProperty("--co2-gradient", gradientString);
  };

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
      updateRingGradient();
    });

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        const parentRow = input.closest("tr");
        if (input.classList.contains("time-input") && hasOverlap(parentRow)) {
          input.value = "";
        }
        updateRingGradient();
      });
      if (input.classList.contains("time-input")) {
        input.addEventListener("focus", (e) => (activeInput = e.target));
      }
    });
    updateRingGradient();
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
      updateCo2Ring();
    });

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => updateCo2Ring());
      if (input.classList.contains("time-input")) {
        input.addEventListener("focus", (e) => (activeInput = e.target));
      }
    });
    updateCo2Ring();
  };

  const hasOverlap = (currentRow) => {
    const newStart = timeToMinutes(
      currentRow.querySelectorAll("input")[2].value
    );
    const newEnd = timeToMinutes(currentRow.querySelectorAll("input")[3].value);
    if (newStart === null || newEnd === null) return false;

    for (const row of timerTableBody.querySelectorAll("tr")) {
      if (row === currentRow) continue;
      const oldStart = timeToMinutes(row.querySelectorAll("input")[2].value);
      const oldEnd = timeToMinutes(row.querySelectorAll("input")[3].value);
      if (oldStart === null || oldEnd === null) continue;

      const newRanges =
        newStart <= newEnd
          ? [[newStart, newEnd]]
          : [
              [newStart, 1440],
              [0, newEnd],
            ];
      const oldRanges =
        oldStart <= oldEnd
          ? [[oldStart, oldEnd]]
          : [
              [oldStart, 1440],
              [0, oldEnd],
            ];

      for (const nRange of newRanges) {
        for (const oRange of oldRanges) {
          if (nRange[0] < oRange[1] && nRange[1] > oRange[0]) {
            alert("Error: Timer peak period overlaps with an existing timer.");
            return true;
          }
        }
      }
    }
    return false;
  };

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

  const createHourMarkers = () => {
    const radius = 100;
    if (clock.offsetWidth === 0) {
      setTimeout(createHourMarkers, 100);
      return;
    }
    for (let i = 0; i < 24; i++) {
      const marker = document.createElement("div");
      marker.classList.add("hour-marker");
      const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
      const x = 50 + (radius / clock.offsetWidth) * 100 * Math.cos(angle);
      const y = 50 + (radius / clock.offsetHeight) * 100 * Math.sin(angle);
      marker.style.left = `${x}%`;
      marker.style.top = `${y}%`;
      marker.textContent = i;
      if (i % 6 === 0) {
        marker.classList.add("major");
      }
      clock.appendChild(marker);
    }
  };

  addTimerBtn.addEventListener("click", addTimerRow);
  addCo2TimerBtn.addEventListener("click", addCo2TimerRow);

  addTimerRow();
  addCo2TimerRow();
  createHourMarkers();
});
