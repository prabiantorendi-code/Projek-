import { db } from "./firebase-config.js";
import { collection, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

let allGames = [];

async function loadSiteSettings() {
    try {
        const siteDoc = await getDoc(doc(db, "settings", "site"));
        if (siteDoc.exists()) {
            const data = siteDoc.data();
            if (data.siteName) {
                const siteNameEl = document.getElementById("site-name");
                if (siteNameEl) siteNameEl.textContent = data.siteName;
                document.title = data.siteName;
            }
        }
    } catch (error) {
        console.error("Error loading site settings:", error);
    }
}

function loadGames() {
    const loadingState = document.getElementById("loading-state");
    const emptyState = document.getElementById("empty-state");
    const gamesGrid = document.getElementById("games-grid");

    if (loadingState) loadingState.style.display = "block";
    if (emptyState) emptyState.style.display = "none";
    if (gamesGrid) gamesGrid.innerHTML = "";

    onSnapshot(collection(db, "games"), (snapshot) => {
        if (loadingState) loadingState.style.display = "none";
        allGames = [];
        
        snapshot.forEach((doc) => {
            allGames.push({ id: doc.id, ...doc.data() });
        });
        
        const searchInput = document.getElementById("search-input");
        if (searchInput && searchInput.value) {
            searchGames(searchInput.value);
        } else {
            renderGames(allGames);
        }
    }, (error) => {
        console.error("Error fetching games:", error);
        if (loadingState) loadingState.style.display = "none";
    });
}

function searchGames(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const filteredGames = allGames.filter(game => 
        game.name && game.name.toLowerCase().includes(lowerKeyword)
    );
    renderGames(filteredGames);
}

function renderGames(games) {
    const gamesGrid = document.getElementById("games-grid");
    const emptyState = document.getElementById("empty-state");
    
    gamesGrid.innerHTML = "";
    
    if (games.length === 0) {
        emptyState.style.display = "block";
        emptyState.textContent = allGames.length === 0 ? "Belum ada game tersedia" : "Game tidak ditemukan";
    } else {
        emptyState.style.display = "none";
        games.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";
            card.onclick = () => {
                window.location.href = `detail-game.html?id=${game.id}`;
            };
            
            card.innerHTML = `
                <img src="${game.imageUrl || ''}" alt="${game.name}" class="game-image">
                <div class="game-info">
                    <h3 class="game-name">${game.name}</h3>
                    <button class="btn-buy" onclick="window.location.href='detail-game.html?id=${game.id}'; event.stopPropagation();">Beli Sekarang</button>
                </div>
            `;
            gamesGrid.appendChild(card);
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSiteSettings();
    loadGames();
    
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchGames(e.target.value);
        });
    }
});

