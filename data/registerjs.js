// Image Slider Logic (3s interval)
const images = [
  document.getElementById("slide1"),
  document.getElementById("slide2"),
  document.getElementById("slide3"),
];
let current = 0;
setInterval(() => {
  images[current].style.opacity = 0;
  current = (current + 1) % images.length;
  images[current].style.opacity = 1;
}, 3000);

// Registration Logic
document
  .getElementById("register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("http://192.168.1.22:3000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Registration failed");
        return;
      }

      alert("Registration successful! You can now log in.");
      window.location.href = "/login.html";
    } catch (err) {
      alert("Error registering user");
    }
  });
