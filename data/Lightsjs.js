const ESP32_IP = "http://192.168.1.69";
const NODE_JS_BACKEND_URL = "http://192.168.1.22:3000";

const colorPicker = new iro.ColorPicker("#colorWheel", {
  width: 250,
  color: "#ffffff",
});

colorPicker.on("color:change", function (color) {
  const hex = color.hexString;
  document.getElementById("colorPreview").style.backgroundColor = hex;
});

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // ✨ ADDED: Get user email from token and inform the ESP32
  const { email } = parseJwt(token);
  if (email) {
    fetch(`${ESP32_IP}/save-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => {
        if (res.ok) console.log("✅ Email sent to ESP32 successfully.");
        else console.error("❌ Failed to send email to ESP32.");
      })
      .catch((err) =>
        console.error("❌ Network error sending email to ESP32:", err)
      );
  }

  // 1. Load saved light settings
  fetch(`${NODE_JS_BACKEND_URL}/settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }
        throw new Error(`Failed to load settings: ${res.status}`);
      }
      return res.json();
    })
    .then(({ r, g, b, brightness, autoDaylight }) => {
      // ✨ CHANGED: Also get autoDaylight here
      if (r !== undefined && g !== undefined && b !== undefined) {
        colorPicker.color.rgb = { r, g, b };
        document.getElementById(
          "colorPreview"
        ).style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      }
      if (brightness !== undefined) {
        document.getElementById("brightnessSlider").value = brightness;
      }
      // ✨ CHANGED: Set toggle state from the same settings endpoint
      const toggle = document.getElementById("autoDaylightToggle");
      if (toggle && typeof autoDaylight === "boolean") {
        toggle.checked = autoDaylight;
      }
    })
    .catch((err) => {
      console.error("❌ Error loading settings:", err);
    });

  // 2. Save autoDaylight on toggle change (This part is correct)
  const toggle = document.getElementById("autoDaylightToggle");
  if (toggle) {
    toggle.addEventListener("change", () => {
      fetch(`${NODE_JS_BACKEND_URL}/api/save-auto-daylight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ autoDaylight: toggle.checked }),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Save failed: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (!data.success) {
            console.error("❌ Failed to save autoDaylight state:", data);
          } else {
            console.log("✅ AutoDaylight state saved:", toggle.checked);
          }
        })
        .catch((err) => {
          console.error("❌ Network error saving autoDaylight:", err);
        });
    });
  }
});

// Utility: check toggle state
function isAutoDaylightEnabled() {
  const toggle = document.getElementById("autoDaylightToggle");
  return toggle && toggle.checked;
}

// Apply color logic (unchanged)
async function applyColor() {
  const brightness = parseInt(
    document.getElementById("brightnessSlider").value
  );
  if (isAutoDaylightEnabled()) {
    try {
      const response = await fetch(`${NODE_JS_BACKEND_URL}/api/auto-light`);
      if (!response.ok) throw new Error("Failed to get auto-light color");
      const { r, g, b } = await response.json();

      const adjustedRgb = {
        r: Math.round((r * brightness) / 255),
        g: Math.round((g * brightness) / 255),
        b: Math.round((b * brightness) / 255),
      };

      // auto-update colour in daylight mode
      let autoUpdateInterval = setInterval(() => {
        if (isAutoDaylightEnabled()) {
          applyColor();
        }
      }, 10 * 1000);

      window.addEventListener("beforeunload", () => {
        clearInterval(autoUpdateInterval);
      });

      document.getElementById(
        "colorPreview"
      ).style.backgroundColor = `rgb(${adjustedRgb.r}, ${adjustedRgb.g}, ${adjustedRgb.b})`;

      await sendToESP32(adjustedRgb);
    } catch (err) {
      console.error("❌ Auto-light error:", err);
    }
  } else {
    const rgb = colorPicker.color.rgb;
    await sendColorAndBrightness(rgb, brightness);
  }
}

async function sendToESP32(adjustedRgb) {
  try {
    const response = await fetch(`${ESP32_IP}/setcolor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adjustedRgb),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Failed to send color to ESP32:",
        response.status,
        errorText
      );
    } else {
      console.log("✅ Auto-light color sent to ESP32");
    }
  } catch (error) {
    console.error("❌ Network error while sending color to ESP32:", error);
  }
}

async function sendColorAndBrightness(originalRgb, originalBrightness) {
  const adjustedRgbForESP32 = {
    r: Math.round((originalRgb.r * originalBrightness) / 255),
    g: Math.round((originalRgb.g * originalBrightness) / 255),
    b: Math.round((originalRgb.b * originalBrightness) / 255),
  };

  const dataToESP32 = { ...adjustedRgbForESP32 };

  try {
    const espResponse = await fetch(`${ESP32_IP}/setcolor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToESP32),
    });

    if (!espResponse.ok) {
      const errorText = await espResponse.text();
      console.error(
        "❌ Failed to send color to ESP32:",
        espResponse.status,
        errorText
      );
    } else {
      console.log("✅ Color sent successfully to ESP32!");
    }
  } catch (error) {
    console.error("❌ Network error while sending color to ESP32:", error);
  }

  const dataToBackend = {
    r: originalRgb.r,
    g: originalRgb.g,
    b: originalRgb.b,
    brightness: parseInt(originalBrightness),
  };

  try {
    const token = localStorage.getItem("token");
    const backendResponse = await fetch(`${NODE_JS_BACKEND_URL}/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dataToBackend),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(
        "❌ Failed to update user settings:",
        backendResponse.status,
        errorText
      );
    } else {
      console.log("✅ User settings saved to server.");
    }
  } catch (error) {
    console.error("❌ Network error while updating server settings:", error);
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

// When loading autoDaylight state:
const { email } = parseJwt(token);
fetch(`${NODE_JS_BACKEND_URL}/api/get-auto-daylight`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // If you want authentication, also include:
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ email }),
})
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((settings) => {
    // settings.autoDaylight holds the boolean
    const toggle = document.getElementById("autoDaylightToggle");
    if (toggle && typeof settings.autoDaylight === "boolean") {
      toggle.checked = settings.autoDaylight;
    }
    // You can also read settings.r, settings.g, etc. if needed.
  })
  .catch((err) => {
    console.error("Failed to load autoDaylight state:", err);
  });

function setMode(mode) {
  let rgb, brightness;

  switch (mode) {
    case "Guest":
      rgb = { r: 255, g: 200, b: 150 };
      brightness = 180;
      break;
    case "Night":
      rgb = { r: 20, g: 20, b: 60 };
      brightness = 80;
      break;
    case "Day":
      rgb = { r: 255, g: 255, b: 255 };
      brightness = 255;
      break;
    case "Aesthetic":
      rgb = { r: 150, g: 0, b: 200 };
      brightness = 160;
      break;
    case "Plant":
      rgb = { r: 180, g: 255, b: 180 };
      brightness = 200;
      break;
    case "Plant+":
      rgb = { r: 255, g: 120, b: 50 };
      brightness = 255;
      break;
    default:
      console.warn(`Unknown mode: ${mode}`);
      return;
  }

  colorPicker.color.rgb = rgb;
  document.getElementById("brightnessSlider").value = brightness;
  document.getElementById(
    "colorPreview"
  ).style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  sendColorAndBrightness(rgb, brightness);
}
