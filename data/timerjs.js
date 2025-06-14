document.addEventListener("DOMContentLoaded", () => {
  const addTimerBtn = document.getElementById("add-timer-btn");
  const timerTableBody = document.querySelector("#timer-table tbody");
  const clock = document.querySelector(".clock");
  let activeInput = null;

  const timeToMinutes = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const minutesToPercentage = (minutes) => {
    return (minutes / 1440) * 100;
  };

  const updateRingGradient = () => {
    const rows = timerTableBody.querySelectorAll("tr");
    const baseColor = "#e9e9e9";
    let gradientPoints = [];

    // 1. Collect all valid timer points
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
      ) {
        return; // Skip rows that aren't fully defined
      }

      // This block handles timers where the PEAK period crosses midnight (e.g., 23:00 to 01:00).
      // This logic is correct and remains unchanged.
      if (peakStart > peakEnd) {
        // First part: from fade-in to end of day
        gradientPoints.push({
          percent: minutesToPercentage(fadeIn),
          color: baseColor,
        });
        gradientPoints.push({
          percent: minutesToPercentage(peakStart),
          color: colorHex,
        });
        gradientPoints.push({ percent: 100, color: colorHex });
        // Second part: from start of day to fade-out
        gradientPoints.push({ percent: 0, color: colorHex });
        gradientPoints.push({
          percent: minutesToPercentage(peakEnd),
          color: colorHex,
        });
        gradientPoints.push({
          percent: minutesToPercentage(fadeOut),
          color: baseColor,
        });
      } else {
        // This block handles all other cases, including normal timers and
        // timers where the FADE IN or FADE OUT periods cross midnight.
        // The previous restrictive 'if' condition was removed from here.
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

    // If no valid timers, just show the base color
    if (gradientPoints.length === 0) {
      clock.style.background = baseColor;
      return;
    }

    // 2. Sort all points by percentage. This is crucial for building the gradient correctly.
    gradientPoints.sort((a, b) => a.percent - b.percent);

    // 3. Build the CSS string in a simple, direct way
    const stops = gradientPoints.map(
      (p) => `${p.color} ${p.percent.toFixed(2)}%`
    );

    // Create the final gradient, bookended by the base color to fill any gaps.
    const gradientString = `conic-gradient(${baseColor} 0%, ${stops.join(
      ", "
    )}, ${baseColor} 100%)`;

    clock.style.background = gradientString;
  };

  const hasOverlap = (currentRow) => {
    const newStart = timeToMinutes(
      currentRow.querySelectorAll("input")[2].value
    );
    const newEnd = timeToMinutes(currentRow.querySelectorAll("input")[3].value);
    if (newStart === null || newEnd === null) return false;

    const rows = timerTableBody.querySelectorAll("tr");
    for (const row of rows) {
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

  addTimerBtn.addEventListener("click", addTimerRow);

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

    const totalMinutes = Math.round((angle / 360) * 24 * 60) % 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;

    activeInput.value = formattedTime;
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    activeInput.blur();
    activeInput = null;
  });

  addTimerRow();
});
