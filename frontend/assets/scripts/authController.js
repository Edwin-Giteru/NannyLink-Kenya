import { login, signup } from "../../src/service/authService.js";

// LOGIN
console.log("Auth controller loaded");

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const result = await login(email, password);

    if (result.success) {

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("user_role", result.role);
      localStorage.setItem("user_id", result.id);
      
      alert("Login successful");
      const role = result.role.toLowerCase(); 
    
      if (role === "nanny") {
          window.location.href = "../../src/views/nannydashboard.html"; 
      } else if (role === "family") {
          window.location.href = "../family/dashboard.html";
      } else if (role === "admin") {
          window.location.href = "../admin/dashboard.html";
      } else {
          window.location.href = "../../index.html"; 
      }
    } else {
      alert(result.message || "Login failed");
    }
  });
}

// SIGNUP
const signupForm = document.getElementById("signupForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

if (passwordInput) {
    togglePassword.addEventListener("click", () => {
        const isPassword = passwordInput.getAttribute("type") === "password";
        passwordInput.setAttribute("type", isPassword ? "text" : "password");
        togglePassword.textContent = isPassword ? "👁" : "👁️";
    });

    passwordInput.addEventListener("input", () => {
        const val = passwordInput.value;
        let strength = "";
        let text = "";

        if (val.length > 0) {
            if (val.length < 6) {
                strength = "weak";
                text = "Too weak (min 6 chars)";
            } else if (val.match(/[A-Z]/) && val.match(/[0-9]/) && val.match(/[^A-Za-z0-9]/)) {
                strength = "strong";
                text = "Strong password!";
            } else {
                strength = "medium";
                text = "Medium strength (add caps,numbers and symbols to make it stronger)";
            }
        }

        strengthBar.className = "bar " + strength;
        strengthText.textContent = text;
    });
}

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (passwordInput.value.length < 6) {
            alert("Please use a stronger password.");
            return;
        }

        const userData = {
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            password: passwordInput.value,
            role: document.getElementById("role").value
        };

        const result = await signup(userData);

        if (result.success) {
            alert("Account created successfully!");
            window.location.href = "login.html";
        } else {
            alert(result.message || "Signup failed");
        }
    });
}