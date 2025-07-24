// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updatePassword, // Added
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js"
import {
  getFirestore,
  doc,
  setDoc,
  getDoc, // Added
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"

console.log("script.js: Script loaded and parsing...")

// Your Firebase project configuration (moved to global scope within DOMContentLoaded)
// IMPORTANT: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAWN8YPKurMNnTX-IVnPoEW0mV9tz1l044",
    authDomain: "visionary-times.firebaseapp.com",
    projectId: "visionary-times",
    storageBucket: "visionary-times.firebasestorage.app",
    messagingSenderId: "771462644593",
    appId: "1:771462644593:web:3111071d60f4bcebadacd0",
    measurementId: "G-0NLKTYY9Y3"
}

// Initialize Firebase app globally (within DOMContentLoaded)
let app
let auth
let db

document.addEventListener("DOMContentLoaded", () => {
  console.log("script.js: DOMContentLoaded event fired.")

  const takeQuizBtn = document.getElementById("takeQuizBtn")
  const hallOfFameBtn = document.getElementById("hallOfFameBtn")
  const openNewsletterBtn = document.getElementById("openNewsletterBtn")

  // Get references to new dropdown elements
  const userDropdown = document.getElementById("userDropdown")
  const userDropdownToggle = document.querySelector("#userDropdown .user-dropdown-toggle")
  const welcomeMessage = document.getElementById("welcomeMessage")
  const dropdownMenu = document.getElementById("dropdownMenu")
  const logoutBtn = document.getElementById("logoutBtn")
  const changePasswordBtn = document.getElementById("changePasswordBtn")

  // Get references to auth buttons container
  const authButtonsContainer = document.getElementById("authButtonsContainer")
  const signUpBtn = document.getElementById("signUpBtn") // Re-add for initial setup
  const loginBtn = document.getElementById("loginBtn") // Re-add for initial setup

  // Log if buttons are found (these are primarily on index.html)
  console.log("script.js: takeQuizBtn found?", !!takeQuizBtn)
  console.log("script.js: hallOfFameBtn found?", !!hallOfFameBtn)
  console.log("script.js: openNewsletterBtn found?", !!openNewsletterBtn)

  // Function to handle page transitions
  const navigateWithTransition = (url) => {
    console.log(`script.js: Initiating navigation to ${url}`)
    document.body.classList.add("page-transition-out")
    setTimeout(() => {
      window.location.href = url
    }, 500) // Match this duration to the CSS fadeOutPage animation duration
  }

  // Logic for "VISIONARY TIMES" animation on index.html
  if (window.location.pathname === "/" || window.location.pathname.endsWith("index.html")) {
    console.log("script.js: On index.html page. Triggering 'VISIONARY TIMES' animation on every load.")
    document.body.classList.add("first-load") // Always add class to body to trigger animation
  }

  // Event listeners for navigation buttons (from index.html)
  if (takeQuizBtn) {
    takeQuizBtn.addEventListener("click", (event) => {
      event.preventDefault()
      console.log("script.js: 'Take Quiz' button clicked.")
      navigateWithTransition("quiz.html")
    })
  }

  if (hallOfFameBtn) {
    hallOfFameBtn.addEventListener("click", (event) => {
      event.preventDefault()
      console.log("script.js: 'Hall of Fame' button clicked.")
      navigateWithTransition("hall-of-fame.html")
    })
  }

  if (openNewsletterBtn) {
    openNewsletterBtn.addEventListener("click", (event) => {
      event.preventDefault()
      console.log("script.js: 'Open Newsletter' button clicked.")
      navigateWithTransition("newsletter.html")
    })
  }

  // Add event listeners for "Home" buttons on placeholder pages
  const homeButtons = document.querySelectorAll('.nav-button[onclick*="index.html"]')
  console.log(`script.js: Found ${homeButtons.length} 'Home' buttons.`)
  homeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault()
      console.log("script.js: 'Home' button clicked.")
      navigateWithTransition("index.html")
    })
  })

  // --- Function to update header UI based on auth state ---
  const updateHeaderUI = async (user) => {
    if (!authButtonsContainer || !userDropdown) {
      console.warn("script.js: Header UI elements not found. Cannot update UI.")
      return
    }

    if (user) {
      // User is logged in
      authButtonsContainer.style.display = "none" // Hide login/signup buttons
      userDropdown.style.display = "block" // Show user dropdown

      let displayName = user.email // Default to email if full name not found

      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          if (userData.fullName) {
            displayName = userData.fullName
          }
        }
      } catch (error) {
        console.error("script.js: Error fetching user full name from Firestore:", error)
      }

      welcomeMessage.textContent = `Welcome, ${displayName}!`
      userDropdownToggle.setAttribute("aria-label", `Welcome, ${displayName}! Click to open menu.`)

      // Dropdown toggle logic
      userDropdownToggle.onclick = (event) => {
        event.stopPropagation() // Prevent click from closing immediately
        dropdownMenu.classList.toggle("show")
        userDropdownToggle.classList.toggle("active")
        const isExpanded = dropdownMenu.classList.contains("show")
        userDropdownToggle.setAttribute("aria-expanded", isExpanded)
      }

      // Close dropdown if clicked outside
      document.onclick = (event) => {
        if (!userDropdown.contains(event.target)) {
          dropdownMenu.classList.remove("show")
          userDropdownToggle.classList.remove("active")
          userDropdownToggle.setAttribute("aria-expanded", false)
        }
      }

      // Logout button listener
      if (logoutBtn) {
        logoutBtn.onclick = async () => {
          try {
            await signOut(auth)
            console.log("script.js: User signed out.")
            navigateWithTransition("index.html") // Redirect to home after logout
          } catch (error) {
            console.error("script.js: Error signing out:", error)
            alert("Error signing out. Please try again.")
          }
        }
      }

      // Change Password button listener
      if (changePasswordBtn) {
        changePasswordBtn.onclick = async () => {
          const newPassword = prompt("Enter your new password:")
          if (newPassword && newPassword.length >= 6) {
            try {
              await updatePassword(user, newPassword)
              alert("Password updated successfully! You might need to log in again.")
              console.log("script.js: Password updated for user:", user.email)
              // Force sign out after password change for security, as it often invalidates current session
              await signOut(auth)
              navigateWithTransition("login.html")
            } catch (error) {
              console.error("script.js: Error changing password:", error)
              let errorMessage = "Failed to change password."
              if (error.code === "auth/requires-recent-login") {
                errorMessage =
                  "Please log out and log in again to change your password (requires recent authentication)."
              } else if (error.code === "auth/weak-password") {
                errorMessage = "The new password is too weak. Please choose a stronger password."
              }
              alert(errorMessage)
            }
          } else if (newPassword !== null) {
            // If user didn't cancel, but entered invalid password
            alert("Password must be at least 6 characters long.")
          }
        }
      }

      console.log("script.js: Header UI updated for logged-in user.")
    } else {
      // User is logged out
      authButtonsContainer.style.display = "flex" // Show login/signup buttons
      userDropdown.style.display = "none" // Hide user dropdown

      // Ensure initial event listeners for signup/login buttons are set
      if (signUpBtn && !signUpBtn.hasAttribute("data-listener-added")) {
        signUpBtn.addEventListener("click", (event) => {
          event.preventDefault()
          navigateWithTransition("signup.html")
        })
        signUpBtn.setAttribute("data-listener-added", "true")
      }
      if (loginBtn && !loginBtn.hasAttribute("data-listener-added")) {
        loginBtn.addEventListener("click", (event) => {
          event.preventDefault()
          navigateWithTransition("login.html")
        })
        loginBtn.setAttribute("data-listener-added", "true")
      }
      console.log("script.js: Header UI updated for logged-out user.")
    }
  }

  // --- Firebase Authentication State Listener ---
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    console.log("script.js: Firebase app initialized and services obtained.")
  } catch (firebaseInitError) {
    console.error("script.js: Error initializing Firebase globally:", firebaseInitError)
    // Display a message if Firebase fails to initialize
    const messageElement = document.getElementById("message") // This might not exist on all pages
    if (messageElement) {
      messageElement.textContent = "Failed to initialize Firebase. Check console for details."
      messageElement.classList.add("error")
    }
    return // Exit the DOMContentLoaded event listener if Firebase fails to initialize
  }

  if (auth) {
    onAuthStateChanged(auth, (user) => {
      console.log("script.js: Auth state changed. User:", user ? user.email : "null")
      updateHeaderUI(user)
    })
  } else {
    console.error("script.js: Firebase Auth not initialized. Cannot listen for auth state changes.")
  }

  // --- Sign Up Logic (only if on signup page) ---
  const isSignupPage = window.location.pathname.includes("signup")
  const isLoginPage = window.location.pathname.includes("login")

  if (isSignupPage) {
    const signupForm = document.getElementById("signupForm")
    const messageElement = document.getElementById("message")
    const adminCheckbox = document.getElementById("adminCheckbox") // New
    const adminCodeGroup = document.getElementById("adminCodeGroup") // New
    const adminCodeInput = document.getElementById("adminCode") // New

    // Toggle visibility of admin code input based on checkbox
    if (adminCheckbox && adminCodeGroup) {
      adminCheckbox.addEventListener("change", () => {
        if (adminCheckbox.checked) {
          adminCodeGroup.classList.remove("hidden")
          adminCodeInput.setAttribute("required", "true") // Make code required if checkbox is checked
        } else {
          adminCodeGroup.classList.add("hidden")
          adminCodeInput.removeAttribute("required")
          adminCodeInput.value = "" // Clear input when hidden
        }
      })
    }

    if (signupForm) {
      console.log("script.js: Signup form found. Attaching submit listener.")
      signupForm.addEventListener("submit", async (event) => {
        event.preventDefault() // Prevent default form submission
        console.log("script.js: Signup form submitted.")

        const fullName = signupForm.fullName.value
        const email = signupForm.email.value
        const password = signupForm.password.value
        const isAdmin = adminCheckbox ? adminCheckbox.checked : false // New
        const adminCode = adminCodeInput ? adminCodeInput.value : "" // New

        // Basic client-side validation for password length
        if (password.length < 6) {
          messageElement.textContent = "Password should be at least 6 characters."
          messageElement.classList.add("error")
          console.log("script.js: Password too short.")
          return // Stop execution if password is too short
        }

        let userRole = "user" // Default role
        const ADMIN_SECRET_CODE = "OMVisionariesAdminAccess2112" // New

        if (isAdmin) {
          if (adminCode === ADMIN_SECRET_CODE) {
            userRole = "admin"
            console.log("script.js: Admin code correct. User will be signed up as Admin.")
          } else {
            messageElement.textContent = "Incorrect Admin Code. Please try again or uncheck 'Sign up as Admin'."
            messageElement.classList.add("error")
            console.log("script.js: Incorrect Admin Code.")
            return // Stop execution if admin code is wrong
          }
        }

        messageElement.textContent = "Signing up..."
        messageElement.className = "form-message" // Reset class

        try {
          // 1. Create user with Email and Password using Firebase Authentication
          console.log("script.js: Attempting to create user with email:", email)
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const user = userCredential.user
          console.log("script.js: User created in Firebase Auth:", user.uid)

          // 2. Store additional user data (full name and role) in Firestore
          console.log("script.js: Attempting to store user data in Firestore for UID:", user.uid)
          await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            role: userRole, // Store the determined role
            createdAt: serverTimestamp(),
          })
          console.log("script.js: User data successfully stored in Firestore for UID:", user.uid)

          messageElement.textContent = `Sign up successful as ${userRole}! Redirecting to login...`
          messageElement.classList.add("success")

          // Redirect to login page after a short delay
          setTimeout(() => {
            navigateWithTransition("login.html")
          }, 2000) // Give user time to read success message
        } catch (error) {
          console.error("script.js: Error during sign up process:", error)
          let errorMessage = "An unknown error occurred."
          if (error.code) {
            switch (error.code) {
              case "auth/email-already-in-use":
                errorMessage = "The email address is already in use by another account."
                break
              case "auth/invalid-email":
                errorMessage = "The email address is not valid."
                break
              case "auth/operation-not-allowed":
                errorMessage = "Email/password accounts are not enabled. Enable it in Firebase Console."
                break
              case "auth/weak-password":
                errorMessage = "The password is too weak. Please choose a stronger password."
                break
              case "permission-denied": // Firestore permission denied
              case "FirebaseError: Missing or insufficient permissions.": // Another common Firestore permission error message
                errorMessage = "Permission denied. Check your Firestore Security Rules."
                break
              default:
                errorMessage = `Error: ${error.message}`
            }
          }
          messageElement.textContent = errorMessage
          messageElement.classList.add("error")
        }
      })
    } else {
      console.log("script.js: Signup form element not found on this page.")
    }
  }

  // --- Login Logic (only if on login page) ---
  if (isLoginPage) {
    const loginForm = document.getElementById("loginForm")
    const messageElement = document.getElementById("message")

    if (loginForm) {
      console.log("script.js: Login form found. Attaching submit listener.")
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault() // Prevent default form submission
        console.log("script.js: Login form submitted.")

        const email = loginForm.email.value
        const password = loginForm.password.value

        messageElement.textContent = "Logging in..."
        messageElement.className = "form-message" // Reset class

        try {
          // Sign in user with Email and Password using Firebase Authentication
          console.log("script.js: Attempting to sign in user with email:", email)
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          const user = userCredential.user
          console.log("script.js: User signed in:", user.uid)

          messageElement.textContent = "Login successful! Redirecting to home..."
          messageElement.classList.add("success")

          // Redirect to home page after a short delay
          setTimeout(() => {
            navigateWithTransition("index.html") // Redirect to your main home page
          }, 1500) // Give user time to read success message
        } catch (error) {
          console.error("script.js: Error during login process:", error)
          let errorMessage = "An unknown error occurred."
          if (error.code) {
            switch (error.code) {
              case "auth/invalid-email":
                errorMessage = "Invalid email address."
                break
              case "auth/user-disabled":
                errorMessage = "This user account has been disabled."
                break
              case "auth/user-not-found":
                errorMessage = "No user found with this email."
                break
              case "auth/wrong-password":
                errorMessage = "Incorrect password."
                break
              case "auth/invalid-credential": // Newer Firebase versions might use this for wrong password/user not found
                errorMessage = "Invalid email or password."
                break
              default:
                errorMessage = `Error: ${error.message}`
            }
          }
          messageElement.textContent = errorMessage
          messageElement.classList.add("error")
        }
      })
    } else {
      console.log("script.js: Login form element not found on this page.")
    }
  }
})
