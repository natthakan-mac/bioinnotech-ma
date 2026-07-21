import { db } from '../config/firebase.js';
import { collection, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, setDoc, addDoc, query, orderBy, where, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../store/state.js';
import { FirestoreService } from '../services/firestore.js';
import { formatThaiDate } from '../utils/date.js';
import { showDialog, showToast } from '../utils/ui.js';
import { exportDevicesPDF } from './export.js';

// --- Inventory Logic ---
let inventoryItems = [];
let inventoryHistoryItems = [];
let unsubscribeInventory = null;
let unsubscribeHistory = null;

function fetchInventory() {
    if (unsubscribeInventory) {
        unsubscribeInventory();
    }
    if (unsubscribeHistory) {
        unsubscribeHistory();
    }

    // Listen to history to dynamically determine the last transaction per item
    const historyRef = collection(db, "inventory_history");
    unsubscribeHistory = onSnapshot(historyRef, (historySnapshot) => {
        inventoryHistoryItems = historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderInventory();
    }, (error) => {
        console.error("Error fetching inventory history:", error);
    });

    const inventoryRef = collection(db, "inventory");
    const q = query(inventoryRef, orderBy("name"));

    unsubscribeInventory = onSnapshot(q, (snapshot) => {
        inventoryItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderInventory();
    }, (error) => {
        console.error("Error fetching inventory:", error);
    });
}

function renderInventory() {
    const container = document.getElementById("inventory-list-container");
    const searchInput = document.getElementById("inventory-search");
    const countSpan = document.getElementById("header-inventory-count");

    if (!container) return;

    // We don't need cards-grid anymore since it's a table
    if (container.classList.contains("cards-grid")) {
        container.classList.remove("cards-grid");
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

    const filteredItems = inventoryItems.filter(item => {
        const nameMatch = (item.name || "").toLowerCase().includes(searchTerm);
        const codeMatch = (item.code || "").toLowerCase().includes(searchTerm);
        return nameMatch || codeMatch;
    });

    if (countSpan) {
        countSpan.textContent = filteredItems.length;
    }

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <p>ไม่พบรายการสินค้า${searchTerm ? "ที่ตรงกับคำค้นหา" : ""}</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    // Build map of the latest transaction for each item from inventoryHistoryItems
    const lastTxMap = {};
    inventoryHistoryItems.forEach(tx => {
        const itemId = tx.itemId;
        if (!itemId) return;

        let txDate = null;
        if (tx.timestamp) {
            txDate = typeof tx.timestamp.toDate === 'function' ? tx.timestamp.toDate() : new Date(tx.timestamp);
        }

        if (txDate && (!lastTxMap[itemId] || txDate > lastTxMap[itemId].date)) {
            lastTxMap[itemId] = {
                quantity: tx.quantity,
                type: tx.type,
                date: txDate
            };
        }
    });

    let html = "";
    filteredItems.forEach((item, index) => {
        const stock = parseInt(item.stock) || 0;
        const imageUrl = item.imageUrl || "https://placehold.co/150x150?text=No+Image";
        const stockColor = stock > 0 ? 'var(--primary-color)' : 'var(--danger-color)';

        // Find last transaction: prioritize computed history, fallback to document fields
        let lastTxDateStr = item.lastTxDateTime ? formatDateTimeDDMMYYYY(item.lastTxDateTime) : "-";

        const computedTx = lastTxMap[item.id];
        if (computedTx) {
            lastTxDateStr = formatDateTimeDDMMYYYY(computedTx.date.toISOString());
        }

        html += `
            <tr>
                <td class="cell-index" data-label="ลำดับ">${index + 1}</td>
                <td class="cell-code" data-label="รหัสสินค้า" style="font-weight: 600;">${item.code || "-"}</td>
                <td class="cell-image" data-label="รูปภาพ" style="text-align: center; vertical-align: middle;">
                    <img src="${imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); display: block; margin: 0 auto;">
                </td>
                <td class="cell-name" data-label="ชื่อสินค้า">
                    <div style="font-weight: 600; font-size: 1rem;">${item.name}</div>
                </td>
                <td class="cell-stock" data-label="จำนวนคงเหลือ" style="text-align: center; font-weight: 700; font-size: 1.1rem; color: ${stockColor};">
                    ${stock}
                </td>
                <td class="cell-date" data-label="วันเวลาทำรายการล่าสุด" style="text-align: center; font-size: 0.9rem; color: var(--text-muted);">${lastTxDateStr}</td>
                <td class="cell-actions" data-label="เมนูจัดการ" style="text-align: right;">
                    <div class="actions-wrapper">
                        <button class="btn-icon" onclick="openStockAdjustment('${item.id}', 'add')" title="เพิ่มสต๊อก">
                            <i class="fa-solid fa-plus" style="font-size: 0.9rem; color: #16a34a;"></i>
                        </button>
                        <button class="btn-icon" onclick="openStockAdjustment('${item.id}', 'remove')" title="ลดสต๊อก">
                            <i class="fa-solid fa-minus" style="font-size: 0.9rem; color: #dc2626;"></i>
                        </button>
                        <button class="btn-icon" onclick="openEditInventoryModal('${item.id}')" title="แก้ไขข้อมูลสินค้า">
                            <i class="fa-solid fa-pen" style="font-size: 0.9rem;"></i>
                        </button>
                        ${currentUserRole === 'admin' || currentUserRole === 'manager' ? `
                        <button class="btn-icon action-delete" onclick="deleteInventoryItem('${item.id}', '${item.name.replace(/'/g, "\\'")}')" title="ลบสินค้า">
                            <i class="fa-solid fa-trash" style="font-size: 0.9rem; color: #dc2626;"></i>
                        </button>
                        ` : ''}
                        <button class="btn-icon" onclick="viewInventoryHistory('${item.id}')" title="ประวัติการทำรายการ">
                            <i class="fa-solid fa-clock-rotate-left" style="font-size: 0.9rem;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

window.deleteInventoryItem = async function (itemId, itemName) {
    if (!confirm(`คุณต้องการลบสินค้า "${itemName}" ใช่หรือไม่? การลบนี้จะไม่สามารถย้อนกลับได้`)) {
        return;
    }

    try {
        const docRef = doc(db, "inventory", itemId);
        await deleteDoc(docRef);

        const user = auth.currentUser;
        await addDoc(collection(db, "inventory_history"), {
            itemId: itemId,
            type: "remove",
            quantity: 0,
            notes: `ลบสินค้า: ${itemName}`,
            timestamp: serverTimestamp(),
            userEmail: user ? user.email : "Unknown"
        });

        alert("ลบสินค้าเรียบร้อยแล้ว");
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        alert("เกิดข้อผิดพลาดในการลบสินค้า");
    }
};

window.openStockAdjustment = function (itemId, type) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById("stock-adjustment-form").reset();
    document.getElementById("stock-adj-item-id").value = itemId;
    document.getElementById("stock-adj-type").value = type;
    document.getElementById("stock-adj-current").value = item.stock;

    const titleStr = type === 'add' ? `นำเข้าสต๊อก: ${item.name}` : `เบิกจ่ายสต๊อก: ${item.name}`;
    document.getElementById("modal-stock-adjustment-title").textContent = titleStr;
    document.getElementById("modal-stock-adjustment-title").style.color = type === 'add' ? '#16a34a' : '#dc2626';

    const modal = document.getElementById("modal-stock-adjustment");
    modal.classList.remove("hidden");
    modal.style.display = "flex";
};

window.submitStockAdjustment = async function () {
    const itemId = document.getElementById("stock-adj-item-id").value;
    const type = document.getElementById("stock-adj-type").value;
    const currentStock = parseInt(document.getElementById("stock-adj-current").value) || 0;
    const quantity = parseInt(document.getElementById("stock-adj-quantity").value);
    const notes = document.getElementById("stock-adj-notes").value.trim();

    if (!quantity || quantity <= 0) {
        alert("กรุณาระบุจำนวนให้ถูกต้อง (มากกว่า 0)");
        return;
    }
    if (!notes) {
        alert("กรุณาระบุรายละเอียดหรือหมายเหตุ");
        return;
    }

    let newStock = currentStock;
    if (type === 'add') {
        newStock += quantity;
    } else {
        newStock -= quantity;
        if (newStock < 0) {
            alert("จำนวนสินค้าไม่เพียงพอสำหรับการเบิกจ่าย");
            return;
        }
    }

    const btnSave = document.getElementById("btn-save-stock-adj");
    const originalText = btnSave.innerHTML;

    try {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

        // 1. Update stock and last transaction info in inventory
        const itemRef = doc(db, "inventory", itemId);
        await updateDoc(itemRef, {
            stock: newStock,
            lastTxQty: quantity,
            lastTxType: type,
            lastTxDateTime: new Date().toISOString()
        });

        // 2. Record in history
        const user = auth.currentUser;
        await addDoc(collection(db, "inventory_history"), {
            itemId: itemId,
            type: type,
            quantity: quantity,
            notes: notes,
            timestamp: serverTimestamp(),
            userEmail: user ? user.email : "Unknown"
        });

        document.getElementById("modal-stock-adjustment").classList.add("hidden");
    } catch (error) {
        console.error("Error updating stock:", error);
        alert("เกิดข้อผิดพลาดในการปรับปรุงยอดสต๊อก");
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = originalText;
    }
};

window.viewInventoryHistory = async function (itemId) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const isManageable = currentUserRole === 'admin' || currentUserRole === 'manager';
    const actionHeader = document.getElementById("history-action-header");
    if (actionHeader) {
        actionHeader.style.display = isManageable ? "table-cell" : "none";
    }

    document.getElementById("modal-inventory-history-subtitle").textContent = item.name;
    const tbody = document.getElementById("inventory-history-list");
    const totalCols = isManageable ? 5 : 4;
    tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดประวัติ...</td></tr>`;

    const modal = document.getElementById("modal-inventory-history");
    modal.classList.remove("hidden");
    modal.style.display = "flex";

    try {
        const historyRef = collection(db, "inventory_history");
        // Remove orderBy to avoid requiring a composite index in Firestore
        const q = query(historyRef, where("itemId", "==", itemId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="${totalCols}"><div class="empty-state"><p>ยังไม่มีประวัติการทำรายการ</p></div></td></tr>`;
            return;
        }

        let historyData = [];
        snapshot.forEach(doc => {
            historyData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort descending by timestamp on client-side
        historyData.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        let html = "";
        historyData.forEach(data => {
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleString('th-TH') : "N/A";
            const typeStr = data.type === 'add' ? `<span style="color: #16a34a; font-weight: 600;"><i class="fa-solid fa-plus"></i> นำเข้า</span>` : `<span style="color: #dc2626; font-weight: 600;"><i class="fa-solid fa-minus"></i> เบิกจ่าย</span>`;

            html += `
                <tr>
                    <td class="cell-date" style="font-size: 0.85rem; white-space: nowrap;" data-label="วันที่-เวลา">${dateStr}</td>
                    <td data-label="ประเภท">${typeStr}</td>
                    <td style="text-align: center; font-weight: 700;" data-label="จำนวน">${data.quantity}</td>
                    <td style="font-size: 0.9rem;" data-label="รายละเอียด">
                        <div>${data.notes}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${data.userEmail || ""}</div>
                    </td>
                    ${isManageable ? `
                    <td style="text-align: right;" data-label="การจัดการ">
                        <button class="btn-icon action-delete" onclick="deleteHistoryEntry('${data.id}', '${itemId}')" title="ลบรายการ">
                            <i class="fa-solid fa-trash" style="font-size: 0.85rem; color: #dc2626;"></i>
                        </button>
                    </td>
                    ` : ""}
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (error) {
        console.error("Error fetching history:", error);
        tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align: center; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดประวัติ</td></tr>`;
    }
};

window.deleteHistoryEntry = async function (historyId, itemId) {
    if (!confirm("คุณต้องการลบประวัติการทำรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) {
        return;
    }

    try {
        await deleteDoc(doc(db, "inventory_history", historyId));
        alert("ลบประวัติเรียบร้อยแล้ว");
        viewInventoryHistory(itemId);
    } catch (error) {
        console.error("Error deleting history entry:", error);
        alert("เกิดข้อผิดพลาดในการลบประวัติ");
    }
};

// --- Event Listeners for Inventory ---
window.openAddInventoryModal = function () {
    const modal = document.getElementById("modal-inventory");
    if (!modal) return;

    const title = document.getElementById("modal-inventory-title");
    if (title) title.textContent = "เพิ่มสินค้ารายการใหม่";

    const form = document.getElementById("inventory-form");
    if (form) {
        form.reset();
        delete form.dataset.mode;
        delete form.dataset.itemId;
    }

    const preview = document.getElementById("inventory-image-preview");
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }

    const uploadArea = document.getElementById("inventory-upload-area");
    if (uploadArea) {
        const i = uploadArea.querySelector("i");
        if (i) i.style.display = "block";
        const p = uploadArea.querySelector("p");
        if (p) p.style.display = "block";
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
};

window.openEditInventoryModal = function (itemId) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById("modal-inventory");
    if (!modal) return;

    const title = document.getElementById("modal-inventory-title");
    if (title) title.textContent = "แก้ไขข้อมูลสินค้า";

    const form = document.getElementById("inventory-form");
    if (form) {
        form.dataset.mode = "edit";
        form.dataset.itemId = itemId;
    }

    document.getElementById("inventory-name").value = item.name || "";
    document.getElementById("inventory-code").value = item.code || "";
    document.getElementById("inventory-stock").value = item.stock !== undefined ? item.stock : 0;

    const preview = document.getElementById("inventory-image-preview");
    const uploadArea = document.getElementById("inventory-upload-area");

    if (preview) {
        if (item.imageUrl) {
            preview.src = item.imageUrl;
            preview.style.display = "block";
            if (uploadArea) {
                const i = uploadArea.querySelector("i");
                if (i) i.style.display = "none";
                const p = uploadArea.querySelector("p");
                if (p) p.style.display = "none";
            }
        } else {
            preview.src = "";
            preview.style.display = "none";
            if (uploadArea) {
                const i = uploadArea.querySelector("i");
                if (i) i.style.display = "block";
                const p = uploadArea.querySelector("p");
                if (p) p.style.display = "block";
            }
        }
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
};

function setupInventoryListeners() {
    const searchInput = document.getElementById("inventory-search");
    if (searchInput) {
        searchInput.addEventListener("input", renderInventory);
    }

    const inventoryImageInput = document.getElementById("inventory-image-input");
    const inventoryUploadArea = document.getElementById("inventory-upload-area");

    if (inventoryUploadArea && inventoryImageInput) {
        inventoryUploadArea.addEventListener("click", () => inventoryImageInput.click());
        inventoryImageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const preview = document.getElementById("inventory-image-preview");
                    preview.src = e.target.result;
                    preview.style.display = "block";
                    inventoryUploadArea.querySelector("i").style.display = "none";
                    inventoryUploadArea.querySelector("p").style.display = "none";
                }
                reader.readAsDataURL(file);
            }
        });
    }

    const btnSave = document.getElementById("btn-save-inventory");
    if (btnSave) {
        // Prevent multiple bindings
        const newBtnSave = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtnSave, btnSave);

        newBtnSave.addEventListener("click", async () => {
            const form = document.getElementById("inventory-form");
            const mode = form ? form.dataset.mode : "add";
            const itemId = form ? form.dataset.itemId : "";

            const name = document.getElementById("inventory-name").value.trim();
            const code = document.getElementById("inventory-code").value.trim();
            const stockVal = document.getElementById("inventory-stock").value;
            const fileInput = document.getElementById("inventory-image-input");

            if (!name || stockVal === "") {
                alert("กรุณากรอกข้อมูลให้ครบถ้วน");
                return;
            }

            const stock = parseInt(stockVal);

            try {
                newBtnSave.disabled = true;
                newBtnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

                let imageUrl = "";
                if (fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const storageRef = ref(storage, `inventory/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    imageUrl = await getDownloadURL(snapshot.ref);
                }

                if (mode === "edit") {
                    const updateData = { name, code, stock };
                    if (imageUrl) {
                        updateData.imageUrl = imageUrl;
                    }

                    const item = inventoryItems.find(i => i.id === itemId);
                    if (item && item.stock !== stock) {
                        const diff = Math.abs(stock - item.stock);
                        const type = stock > item.stock ? "add" : "remove";
                        updateData.lastTxQty = diff;
                        updateData.lastTxType = type;
                        updateData.lastTxDateTime = new Date().toISOString();

                        const user = auth.currentUser;
                        await addDoc(collection(db, "inventory_history"), {
                            itemId: itemId,
                            type: type,
                            quantity: diff,
                            notes: "แก้ไขข้อมูลสินค้า (ปรับปรุงยอดคงเหลือ)",
                            timestamp: serverTimestamp(),
                            userEmail: user ? user.email : "Unknown"
                        });
                    }

                    await updateDoc(doc(db, "inventory", itemId), updateData);
                } else {
                    await addDoc(collection(db, "inventory"), {
                        name,
                        code,
                        stock,
                        imageUrl,
                        createdAt: serverTimestamp(),
                        lastTxQty: stock,
                        lastTxType: "add",
                        lastTxDateTime: new Date().toISOString()
                    });
                }

                document.getElementById("modal-inventory").classList.add("hidden");

            } catch (error) {
                console.error("Error saving inventory:", error);
                alert("เกิดข้อผิดพลาดในการบันทึกสินค้า");
            } finally {
                newBtnSave.disabled = false;
                newBtnSave.innerHTML = "บันทึกข้อมูล";
            }
        });
    }
}

// Call setupInventoryListeners
setupInventoryListeners();

window.exportDevicesPDF = exportDevicesPDF;

// ============================================================
// === LINE Login System (LIFF SDK) ===
// ============================================================

const LIFF_ID = '2008894954-o8Us8rV9';
let liffInitialized = false;
let liffInitPromise = null;

/**
 * Initialize LIFF SDK (called lazily on first LINE action)
 */

export { fetchInventory, renderInventory };