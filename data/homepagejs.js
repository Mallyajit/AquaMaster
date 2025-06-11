async function verifyToken(token) {
  try {
    const response = await fetch("http://192.168.1.22:3000/api/verify-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.firstName; // Return username if token is valid
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

(async () => {
  const token = localStorage.getItem("token");
  const firstName = await verifyToken(token);

  if (!firstName) {
    window.location.href = "/login.html"; // Redirect if not logged in
  } else {
    const messageEl = document.getElementById("welcome-message");
    messageEl.textContent = `Welcome, ${firstName}!`;
  }
})();
