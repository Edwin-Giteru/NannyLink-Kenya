import { login, signup } from "../../src/service/authService.js";

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const result = await login(email, password);

    if (result.success) {
      alert("Login successful");
      window.location.href = "../../index.html";
    } else {
      alert(result.message || "Login failed");
    }
  });
}

// SIGNUP
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userData = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      role: document.getElementById("role").value
    };

    const result = await signup(userData);

    if (result.success) {
      alert("Account created successfully");
      window.location.href = "login.html";
    } else {
      alert(result.message || "Signup failed");
    }
    if (!response.ok) {
    const error = await response.json();
    alert(error.detail || "Something went wrong");
    }

  });
}
