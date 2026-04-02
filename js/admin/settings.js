import { db, storage } from "../firebase-config.js";
import { checkAuth } from "../auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js";

let currentLogoUrl = "";
let currentIconUrl = "";

async function loadSettings() {
    try {
        const docRef = doc(db, "settings", "site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const siteNameEl = document.getElementById("input-sitename");
            const siteDescEl = document.getElementById("input-description");
            const siteKeywordsEl = document.getElementById("input-keywords");
            const siteAuthorEl = document.getElementById("input-author");
            
            if (siteNameEl) siteNameEl.value = data.siteName || "";
            if (siteDescEl) siteDescEl.value = data.siteDescription || "";
            if (siteKeywordsEl) siteKeywordsEl.value = data.siteKeywords || "";
            if (siteAuthorEl) siteAuthorEl.value = data.siteAuthor || "";

            if (data.logoUrl) {
                currentLogoUrl = data.logoUrl;
                const previewLogo = document.getElementById("preview-logo");
                if (previewLogo) {
                    previewLogo.src = currentLogoUrl;
                    previewLogo.style.display = "block";
                }
            }

            if (data.iconUrl) {
                currentIconUrl = data.iconUrl;
                const previewIcon = document.getElementById("preview-icon");
                if (previewIcon) {
                    previewIcon.src = currentIconUrl;
                    previewIcon.style.display = "block";
                }
            }
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

async function uploadImage(file, path) {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

async function saveSettings(e) {
    if (e) e.preventDefault();

    const siteNameEl = document.getElementById("input-sitename");
    const siteDescEl = document.getElementById("input-description");
    const siteKeywordsEl = document.getElementById("input-keywords");
    const siteAuthorEl = document.getElementById("input-author");

    const siteName = siteNameEl ? siteNameEl.value.trim() : "";
    const siteDescription = siteDescEl ? siteDescEl.value.trim() : "";
    const siteKeywords = siteKeywordsEl ? siteKeywordsEl.value.trim() : "";
    const siteAuthor = siteAuthorEl ? siteAuthorEl.value.trim() : "";

    const btnSave = document.getElementById("btn-save");
    const successMsg = document.getElementById("success-message");
    const errorMsg = document.getElementById("error-message");

    if (successMsg) successMsg.style.display = "none";
    if (errorMsg) errorMsg.style.display = "none";

    if (!siteName || !siteDescription || !siteKeywords || !siteAuthor) {
        if (errorMsg) {
            errorMsg.innerText = "Semua field teks tidak boleh kosong!";
            errorMsg.style.display = "block";
        }
        return;
    }

    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerText = "Menyimpan...";
    }

    try {
        const logoInput = document.getElementById("input-logo");
        const iconInput = document.getElementById("input-icon");

        if (logoInput && logoInput.files.length > 0) {
            const file = logoInput.files[0];
            const path = `settings/logo_${Date.now()}_${file.name}`;
            currentLogoUrl = await uploadImage(file, path);
        }

        if (iconInput && iconInput.files.length > 0) {
            const file = iconInput.files[0];
            const path = `settings/icon_${Date.now()}_${file.name}`;
            currentIconUrl = await uploadImage(file, path);
        }

        await setDoc(doc(db, "settings", "site"), {
            siteName: siteName,
            siteDescription: siteDescription,
            siteKeywords: siteKeywords,
            siteAuthor: siteAuthor,
            logoUrl: currentLogoUrl,
            iconUrl: currentIconUrl
        }, { merge: true });

        if (successMsg) {
            successMsg.innerText = "Pengaturan berhasil disimpan!";
            successMsg.style.display = "block";
        }
    } catch (error) {
        console.error("Error saving settings:", error);
        if (errorMsg) {
            errorMsg.innerText = "Terjadi kesalahan saat menyimpan pengaturan.";
            errorMsg.style.display = "block";
        }
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerText = "Simpan Pengaturan";
        }
    }
}

function previewImage(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    if (input && preview) {
        input.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    loadSettings();
    previewImage("input-logo", "preview-logo");
    previewImage("input-icon", "preview-icon");
    
    const btnSave = document.getElementById("btn-save");
    if (btnSave) {
        btnSave.addEventListener("click", saveSettings);
    }
});

