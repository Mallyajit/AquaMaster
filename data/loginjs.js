console.log("Loginjs loaded");
const NODE_JS_BACKEND_URL = "http://192.168.1.13:3000";

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
    window.location.href = "/homepage.html";
  } catch (err) {
    alert("Error logging in");
  }
});

// You can set the image dynamically if needed
document.getElementById("loginImage").src =
  "https://i.ibb.co/PvZmLF0H/Chat-GPT-Image-May-23-2025-04-41-17-PM.png"; // Replace with actual image
