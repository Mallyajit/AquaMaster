console.log("Loginjs loaded");
const NODE_JS_BACKEND_URL = "http://192.168.1.22:3000";
const ESP32_IP = "http://192.168.1.69";

async function verifyToken(token) {
  if (!token) return null;

  try {
    const response = await fetch(`${NODE_JS_BACKEND_URL}/api/verify-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data && data.username ? data.username : null;
  } catch (error) {
    return null;
  }
}

async function sendEmailToESP32(email) {
  console.log(`Attempting to send email (${email}) to ESP32...`);
  try {
    const response = await fetch(`${ESP32_IP}/save-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      console.log("✅ Email sent to ESP32 successfully.");
    } else {
      // The ESP32 might be offline, but we don't want to stop the login.
      console.error("❌ Failed to send email to ESP32. It might be offline.");
    }
  } catch (err) {
    console.error("❌ Network error sending email to ESP32:", err);
  }
}

// Auto-redirect if already logged in
(async () => {
  const token = localStorage.getItem("token");
  const username = await verifyToken(token);
  if (username) {
    window.location.href = "/homepage.html";
  }
})();

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${NODE_JS_BACKEND_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      alert("Login failed");
      return;
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);

    const tokenPayload = JSON.parse(atob(data.token.split(".")[1]));
    localStorage.setItem("userEmail", email);

    sendEmailToESP32(email);

    window.location.href = "/homepage.html";
  } catch (err) {
    alert("Error logging in");
  }
});

// You can set the image dynamically if needed
document.getElementById("loginImage").src =
  "https://i.ibb.co/PvZmLF0H/Chat-GPT-Image-May-23-2025-04-41-17-PM.png";
