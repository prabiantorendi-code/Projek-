import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

export function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(angka);
}

export async function getWhatsappConfig() {
    try {
        const docRef = doc(db, "whatsapp", "config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error getting WhatsApp config:", error);
        return null;
    }
}

export function buildMessage(template, data) {
    if (!template) return "";
    let message = template;
    message = message.replace(/{game}/g, data.game || "");
    message = message.replace(/{product}/g, data.product || "");
    message = message.replace(/{price}/g, data.price ? formatRupiah(data.price) : "");
    return message;
}

export async function redirectToWhatsapp(gameId, productId) {
    try {
        const config = await getWhatsappConfig();
        if (!config || !config.phoneNumber) {
            alert("Sistem WhatsApp belum dikonfigurasi.");
            return;
        }

        const gameRef = doc(db, "games", gameId);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            alert("Data game tidak ditemukan.");
            return;
        }
        const gameData = gameSnap.data();

        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
            alert("Data produk tidak ditemukan.");
            return;
        }
        const productData = productSnap.data();

        const data = {
            game: gameData.name,
            product: productData.name,
            price: productData.price
        };

        const message = buildMessage(config.messageTemplate, data);
        const encodedMessage = encodeURIComponent(message);
        
        let phone = config.phoneNumber.replace(/\D/g, '');
        if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
        }

        const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(waUrl, '_blank');
    } catch (error) {
        console.error("Error processing order:", error);
        alert("Terjadi kesalahan saat memproses pesanan.");
    }
}

export async function redirectToContact() {
    try {
        const config = await getWhatsappConfig();
        if (config && config.contactLink) {
            window.open(config.contactLink, '_blank');
        } else if (config && config.phoneNumber) {
            let phone = config.phoneNumber.replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '62' + phone.substring(1);
            }
            window.open(`https://wa.me/${phone}`, '_blank');
        } else {
            alert("Link kontak belum dikonfigurasi.");
        }
    } catch (error) {
        console.error("Error redirecting to contact:", error);
    }
}
