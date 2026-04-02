import { auth } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

export function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.replace('../admin/login.html');
        }
    });
}

export async function logout() {
    try {
        await signOut(auth);
        window.location.replace('../admin/login.html');
    } catch (error) {
        console.error("Gagal melakukan logout:", error);
    }
}

export function getCurrentUser() {
    return auth.currentUser;
}

export function onAuthChange(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

