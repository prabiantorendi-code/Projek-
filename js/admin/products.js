import { db } from "../firebase-config.js";
import { checkAuth } from "../auth.js";
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

let currentMode = "add";
let currentProductId = null;
let allProducts = [];

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

async function loadGames() {
    const filterDropdown = document.getElementById("filter-game") || document.getElementById("filterGame");
    const formDropdown = document.getElementById("form-game") || document.getElementById("gameIdSelect");
    
    try {
        const querySnapshot = await getDocs(collection(db, "games"));
        
        if (filterDropdown) filterDropdown.innerHTML = '<option value="">Semua Game</option>';
        if (formDropdown) formDropdown.innerHTML = '<option value="" disabled selected>-- Pilih Game --</option>';
        
        querySnapshot.forEach((docSnap) => {
            const game = docSnap.data();
            const optionHTML = `<option value="${docSnap.id}">${game.name}</option>`;
            if (filterDropdown) filterDropdown.innerHTML += optionHTML;
            if (formDropdown) formDropdown.innerHTML += optionHTML;
        });
    } catch (error) {
        console.error("Error loading games:", error);
    }
}

function loadProducts(gameId = null) {
    const tableBody = document.getElementById("products-table-body") || document.getElementById("productsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Memuat data...</td></tr>';

    let q = collection(db, "products");
    if (gameId) {
        q = query(collection(db, "products"), where("gameId", "==", gameId));
    }

    onSnapshot(q, (snapshot) => {
        allProducts = [];
        tableBody.innerHTML = "";
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Belum ada produk</td></tr>';
            updateBulkButton();
            return;
        }

        let no = 1;
        snapshot.forEach((docSnap) => {
            const product = { id: docSnap.id, ...docSnap.data() };
            allProducts.push(product);
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="row-checkbox custom-checkbox" value="${product.id}">
                </td>
                <td>${no++}</td>
                <td><span style="background: rgba(108, 63, 196, 0.1); color: #6C3FC4; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 500;">${product.gameName || '-'}</span></td>
                <td style="font-weight: 500;">${product.name}</td>
                <td style="color: #6C3FC4; font-weight: 600;">${formatRupiah(product.price)}</td>
                <td style="font-size: 0.9rem; color: #666;">${product.description || '-'}</td>
                <td class="action-buttons">
                    <button class="btn btn-info btn-edit" data-id="${product.id}">Edit</button>
                    <button class="btn btn-danger btn-delete" data-id="${product.id}">Hapus</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", (e) => openEditModal(e.target.getAttribute("data-id")));
        });

        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", (e) => deleteProduct(e.target.getAttribute("data-id")));
        });

        document.querySelectorAll(".row-checkbox").forEach(cb => {
            cb.addEventListener("change", updateBulkButton);
        });

        updateBulkButton();
    }, (error) => {
        console.error("Error loading products:", error);
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">Gagal memuat data</td></tr>';
    });
}

function openAddModal() {
    currentMode = "add";
    currentProductId = null;
    
    const modalTitle = document.getElementById("modalTitle") || document.getElementById("modal-title");
    if (modalTitle) modalTitle.innerText = "Tambah Produk";
    
    const form = document.getElementById("productForm") || document.querySelector("form");
    if (form) form.reset();
    
    const filterDropdown = document.getElementById("filter-game") || document.getElementById("filterGame");
    const formDropdown = document.getElementById("form-game") || document.getElementById("gameIdSelect");
    if (filterDropdown && formDropdown && filterDropdown.value) {
        formDropdown.value = filterDropdown.value;
    }

    const modal = document.getElementById("productModal") || document.querySelector(".modal-overlay");
    if (modal) modal.style.display = "flex";
}

async function openEditModal(productId) {
    currentMode = "edit";
    currentProductId = productId;
    
    const modalTitle = document.getElementById("modalTitle") || document.getElementById("modal-title");
    if (modalTitle) modalTitle.innerText = "Edit Produk";
    
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const formDropdown = document.getElementById("form-game") || document.getElementById("gameIdSelect");
            const nameInput = document.getElementById("productName") || document.getElementById("product-name");
            const priceInput = document.getElementById("productPrice") || document.getElementById("product-price");
            const descInput = document.getElementById("productDesc") || document.getElementById("product-desc");
            
            if (formDropdown) formDropdown.value = data.gameId;
            if (nameInput) nameInput.value = data.name;
            if (priceInput) priceInput.value = data.price;
            if (descInput) descInput.value = data.description || '';
            
            const modal = document.getElementById("productModal") || document.querySelector(".modal-overlay");
            if (modal) modal.style.display = "flex";
        }
    } catch (error) {
        console.error("Error fetching product data:", error);
    }
}

async function saveProduct(e) {
    if (e) e.preventDefault();
    
    const formDropdown = document.getElementById("form-game") || document.getElementById("gameIdSelect");
    const nameInput = document.getElementById("productName") || document.getElementById("product-name");
    const priceInput = document.getElementById("productPrice") || document.getElementById("product-price");
    const descInput = document.getElementById("productDesc") || document.getElementById("product-desc");
    const btnSave = document.getElementById("btnSave") || document.getElementById("btn-save");
    
    const gameId = formDropdown.value;
    const gameName = formDropdown.options[formDropdown.selectedIndex]?.text || "";
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const description = descInput.value.trim();

    if (!gameId || !name || isNaN(price) || price < 0) {
        alert("Mohon lengkapi semua field dengan benar!");
        return;
    }

    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerText = "Menyimpan...";
    }

    try {
        const productData = {
            gameId,
            gameName,
            name,
            price,
            description
        };

        if (currentMode === "add") {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, "products"), productData);
        } else if (currentMode === "edit") {
            await updateDoc(doc(db, "products", currentProductId), productData);
        }

        closeModal();
    } catch (error) {
        console.error("Error saving product:", error);
        alert("Terjadi kesalahan saat menyimpan produk.");
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerText = "Simpan";
        }
    }
}

async function deleteProduct(productId) {
    if (confirm("Apakah kamu yakin ingin menghapus produk ini?")) {
        try {
            await deleteDoc(doc(db, "products", productId));
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Terjadi kesalahan saat menghapus produk.");
        }
    }
}

async function deleteBulk() {
    const checkedBoxes = document.querySelectorAll(".row-checkbox:checked");
    if (checkedBoxes.length === 0) return;

    if (confirm(`Apakah kamu yakin ingin menghapus ${checkedBoxes.length} produk yang dipilih?`)) {
        const bulkBtn = document.getElementById("bulk-delete-btn") || document.getElementById("bulkDeleteBtn");
        if (bulkBtn) {
            bulkBtn.disabled = true;
            bulkBtn.innerText = "Menghapus...";
        }

        try {
            const deletePromises = Array.from(checkedBoxes).map(cb => {
                return deleteDoc(doc(db, "products", cb.value));
            });
            
            await Promise.all(deletePromises);
            
            const selectAllCheckbox = document.getElementById("select-all") || document.getElementById("selectAllCheckbox");
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            updateBulkButton();
        } catch (error) {
            console.error("Error bulk deleting:", error);
            alert("Terjadi kesalahan saat menghapus data.");
        } finally {
            if (bulkBtn) bulkBtn.disabled = false;
        }
    }
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById("select-all") || document.getElementById("selectAllCheckbox");
    const checkboxes = document.querySelectorAll(".row-checkbox");
    
    const isChecked = selectAllCheckbox ? selectAllCheckbox.checked : false;
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
    });
    
    updateBulkButton();
}

function updateBulkButton() {
    const checkedBoxes = document.querySelectorAll(".row-checkbox:checked");
    const totalBoxes = document.querySelectorAll(".row-checkbox").length;
    const bulkBtn = document.getElementById("bulk-delete-btn") || document.getElementById("bulkDeleteBtn");
    const selectAllCheckbox = document.getElementById("select-all") || document.getElementById("selectAllCheckbox");
    
    if (selectAllCheckbox && totalBoxes > 0) {
        selectAllCheckbox.checked = checkedBoxes.length === totalBoxes;
    }

    if (bulkBtn) {
        if (checkedBoxes.length > 0) {
            bulkBtn.style.display = "inline-flex";
            bulkBtn.innerText = `🗑️ Hapus Masal (${checkedBoxes.length})`;
        } else {
            bulkBtn.style.display = "none";
        }
    }
}

function closeModal() {
    const modal = document.getElementById("productModal") || document.querySelector(".modal-overlay");
    if (modal) modal.style.display = "none";
    
    const form = document.getElementById("productForm") || document.querySelector("form");
    if (form) form.reset();
    
    currentMode = "add";
    currentProductId = null;
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    loadGames();
    loadProducts();

    const filterDropdown = document.getElementById("filter-game") || document.getElementById("filterGame");
    if (filterDropdown) {
        filterDropdown.addEventListener("change", (e) => {
            const val = e.target.value;
            loadProducts(val || null);
        });
    }

    const btnAddProduct = document.querySelector("header .btn-primary") || document.getElementById("btn-add-product") || document.querySelector('button[onclick="openModal()"]');
    if (btnAddProduct) {
        btnAddProduct.addEventListener("click", openAddModal);
        btnAddProduct.removeAttribute('onclick'); 
    }

    const form = document.getElementById("productForm") || document.querySelector("form");
    if (form) {
        form.addEventListener("submit", saveProduct);
    }

    const closeButtons = document.querySelectorAll(".close-modal, .btn-secondary");
    closeButtons.forEach(btn => {
        btn.addEventListener("click", closeModal);
        btn.removeAttribute('onclick'); 
    });

    const btnBulkDelete = document.getElementById("bulk-delete-btn") || document.getElementById("bulkDeleteBtn");
    if (btnBulkDelete) {
        btnBulkDelete.addEventListener("click", deleteBulk);
        btnBulkDelete.removeAttribute('onclick'); 
    }

    const selectAllCheckbox = document.getElementById("select-all") || document.getElementById("selectAllCheckbox");
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", toggleSelectAll);
        selectAllCheckbox.removeAttribute('onclick'); 
    }
});

