import { db, storage } from "../firebase-config.js";
import { checkAuth } from "../auth.js";
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js";

let currentMode = "add";
let currentGameId = null;
let currentImageUrl = "";

function loadGames() {
    const tableBody = document.getElementById("games-table-body") || document.getElementById("gamesTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Memuat data...</td></tr>';

    onSnapshot(collection(db, "games"), (snapshot) => {
        tableBody.innerHTML = "";
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada game</td></tr>';
            return;
        }

        let no = 1;
        snapshot.forEach((docSnap) => {
            const game = docSnap.data();
            const tr = document.createElement("tr");
            
            tr.innerHTML = `
                <td>${no++}</td>
                <td class="td-image"><img src="${game.imageUrl}" alt="${game.name}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;"></td>
                <td>${game.name}</td>
                <td>${game.category}</td>
                <td class="action-buttons">
                    <button class="btn btn-info btn-edit" data-id="${docSnap.id}">Edit</button>
                    <button class="btn btn-danger btn-delete" data-id="${docSnap.id}">Hapus</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", (e) => openEditModal(e.target.getAttribute("data-id")));
        });

        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", (e) => deleteGame(e.target.getAttribute("data-id")));
        });
        
    }, (error) => {
        console.error("Error loading games:", error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Gagal memuat data</td></tr>';
    });
}

function openAddModal() {
    currentMode = "add";
    currentGameId = null;
    currentImageUrl = "";
    
    const modalTitle = document.getElementById("modalTitle") || document.getElementById("modal-title");
    if (modalTitle) modalTitle.innerText = "Tambah Game";
    
    const form = document.getElementById("gameForm") || document.querySelector("form");
    if (form) form.reset();
    
    const preview = document.getElementById("image-preview") || document.getElementById("imagePreview");
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }
    
    const modal = document.getElementById("gameModal") || document.querySelector(".modal-overlay");
    if (modal) modal.style.display = "flex";
}

async function openEditModal(gameId) {
    currentMode = "edit";
    currentGameId = gameId;
    
    const modalTitle = document.getElementById("modalTitle") || document.getElementById("modal-title");
    if (modalTitle) modalTitle.innerText = "Edit Game";
    
    try {
        const docRef = doc(db, "games", gameId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const nameInput = document.getElementById("gameName") || document.getElementById("game-name");
            const categoryInput = document.getElementById("gameCategory") || document.getElementById("game-category");
            if (nameInput) nameInput.value = data.name;
            if (categoryInput) categoryInput.value = data.category;
            
            currentImageUrl = data.imageUrl;
            const preview = document.getElementById("image-preview") || document.getElementById("imagePreview");
            if (preview && currentImageUrl) {
                preview.src = currentImageUrl;
                preview.style.display = "block";
            }
            
            const modal = document.getElementById("gameModal") || document.querySelector(".modal-overlay");
            if (modal) modal.style.display = "flex";
        }
    } catch (error) {
        console.error("Error fetching game data:", error);
    }
}

async function saveGame(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById("gameName") || document.getElementById("game-name");
    const categoryInput = document.getElementById("gameCategory") || document.getElementById("game-category");
    const imageInput = document.getElementById("gameImage") || document.getElementById("game-image");
    const btnSave = document.getElementById("btnSave") || document.getElementById("btn-save");
    
    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const file = imageInput.files[0];

    if (!name || !category) {
        alert("Nama game dan kategori tidak boleh kosong!");
        return;
    }

    if (currentMode === "add" && !file) {
        alert("Gambar game wajib diupload!");
        return;
    }

    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerText = "Menyimpan...";
    }

    try {
        let imageUrl = currentImageUrl;

        if (file) {
            const fileName = `games/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }

        if (currentMode === "add") {
            await addDoc(collection(db, "games"), {
                name: name,
                category: category,
                imageUrl: imageUrl,
                createdAt: serverTimestamp()
            });
        } else if (currentMode === "edit") {
            await updateDoc(doc(db, "games", currentGameId), {
                name: name,
                category: category,
                imageUrl: imageUrl
            });
        }

        closeModal();
    } catch (error) {
        console.error("Error saving game:", error);
        alert("Terjadi kesalahan saat menyimpan game.");
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerText = "Simpan";
        }
    }
}

async function deleteGame(gameId) {
    if (confirm("Apakah kamu yakin ingin menghapus game ini?")) {
        try {
            await deleteDoc(doc(db, "games", gameId));
        } catch (error) {
            console.error("Error deleting game:", error);
            alert("Terjadi kesalahan saat menghapus game.");
        }
    }
}

function closeModal() {
    const modal = document.getElementById("gameModal") || document.querySelector(".modal-overlay");
    if (modal) modal.style.display = "none";
    
    const form = document.getElementById("gameForm") || document.querySelector("form");
    if (form) form.reset();
    
    const preview = document.getElementById("image-preview") || document.getElementById("imagePreview");
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }
    
    currentMode = "add";
    currentGameId = null;
    currentImageUrl = "";
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    loadGames();

    const btnAddGame = document.querySelector("header .btn-primary") || document.getElementById("btn-add-game");
    if (btnAddGame) {
        btnAddGame.addEventListener("click", openAddModal);
    }

    const form = document.getElementById("gameForm") || document.querySelector("form");
    if (form) {
        form.addEventListener("submit", saveGame);
    }

    const closeButtons = document.querySelectorAll(".close-modal, .btn-secondary");
    closeButtons.forEach(btn => {
        btn.addEventListener("click", closeModal);
    });

    const imageInput = document.getElementById("gameImage") || document.getElementById("game-image");
    const imagePreview = document.getElementById("image-preview") || document.getElementById("imagePreview");
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.style.display = "block";
            } else {
                imagePreview.src = currentImageUrl;
                imagePreview.style.display = currentImageUrl ? "block" : "none";
            }
        });
    }
});
