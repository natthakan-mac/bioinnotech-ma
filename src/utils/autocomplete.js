import { auth, db } from '../config/firebase.js';
import { state } from '../store/state.js';
import { getCategorySpecificDoneFields } from '../ui/forms.js'; // to be created

function calculateDuration(startDateStr, endDateStr) {
    if (!endDateStr) return null;
    const now = new Date();
    const end = new Date(endDateStr);

    // Reset hours to ensure clean day calculation
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // FIX: Detect Buddhist Year (BE) and convert to Christian Year (CE)
    // Heuristic: If year > 2400, assume it's BE (Current BE is ~2567)
    if (end.getFullYear() > 2400) {
        end.setFullYear(end.getFullYear() - 543);
    }

    if (isNaN(end)) return null;

    if (end < now) {
        return "หมดอายุสัญญา";
    }

    let years = end.getFullYear() - now.getFullYear();
    let months = end.getMonth() - now.getMonth();
    let days = end.getDate() - now.getDate();

    if (days < 0) {
        // Borrow days from previous month
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);
    // Days removed as per user request
    // if (days > 0) parts.push(`${days} วัน`);

    if (parts.length === 0) {
        // If remaining is less than a month (but not expired), show "< 1 เดือน" or similar?
        // Or if it was just days, it might show empty.
        // Let's check logic: logic borrows days to months, so months calculation is accurate.
        // If 0 years 0 months but 20 days -> parts empty.
        // Should we display something?
        // User requested ONLY year and month. If it's less than a month, maybe "น้อยกว่า 1 เดือน" or just "0 เดือน"?
        // Let's default to "น้อยกว่า 1 เดือน" if it's not expired but parts is empty.
        return "น้อยกว่า 1 เดือน";
    }

    return "เหลือ " + parts.join(" ");
}

function setupAutocomplete(
    inputId,
    dropdownId,
    getItems,
    onSelect,
    placeholder = "ค้นหา...",
    strict = true,
    minChars = 1,
) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Get the wrapper element
    const wrapper = input.closest('.autocomplete-wrapper');

    const renderDropdown = (filterText = "") => {
        const items = getItems(); // Should return string array

        // Require minimum characters before showing dropdown
        if (filterText.trim().length < minChars) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        const matches = items.filter((a) =>
            a.toLowerCase().includes(filterText.toLowerCase()),
        ).slice(0, 50);

        dropdown.innerHTML = "";
        if (matches.length === 0) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        matches.forEach((item) => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.textContent = item;
            div.onclick = () => {
                input.value = item;
                dropdown.classList.add("hidden");
                if (wrapper) wrapper.classList.remove("active");
                if (onSelect) onSelect(item);
            };
            dropdown.appendChild(div);
        });

        dropdown.classList.remove("hidden");
        if (wrapper) wrapper.classList.add("active");
    };

    input.addEventListener("input", (e) => {
        renderDropdown(e.target.value);
    });

    input.addEventListener("focus", () => {
        renderDropdown(input.value);
    });

    input.addEventListener("blur", () => {
        setTimeout(async () => {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");

            // Validate input against the exact list from the API
            if (strict && input.value.trim() !== "") {
                const items = getItems();
                if (!items.includes(input.value)) {
                    input.value = "";
                    await showDialog("กรุณาเลือกข้อมูลจากรายการที่แสดงให้เท่านั้น", {
                        title: "ข้อมูลไม่ถูกต้อง",
                    });

                    // Trigger input event to clear any dependent logic if necessary
                    input.dispatchEvent(new Event("input"));
                }
            }
        }, 200);
    });
}

async function handleProvinceSelect(provinceName) {
    // Clear downstream
    addressInputs.amphoe.value = "";
    addressInputs.amphoe.disabled = false;
    addressInputs.tambon.value = "";
    addressInputs.tambon.disabled = true; // wait for amphoe

    // Clear agencies until district is selected
    const select = document.getElementById("input-agency");
    if (select) {
        select.innerHTML = '<option value="">กรุณาเลือกอำเภอก่อน</option>';
    }

    updateSiteName();
}

async function handleAmphoeSelect(amphoeName) {
    const provinceName = addressInputs.province.value;
    if (!provinceName) return;

    addressInputs.tambon.value = "";
    addressInputs.tambon.disabled = false;

    // Filter agencies by province and district
    await filterAgenciesByLocation(provinceName, amphoeName);

    updateSiteName();
}

function handleTambonSelect(tambonName) {
    const provinceName = addressInputs.province.value;
    const amphoeName = addressInputs.amphoe.value;

    if (provinceName && amphoeName) {
        const entry = state.addressData.find(
            (d) =>
                d.province === provinceName &&
                d.amphoe === amphoeName &&
                d.district === tambonName,
        );
        if (entry && addressInputs.zipcode) {
            addressInputs.zipcode.value = entry.zipcode;
        }
    }
    updateSiteName();
}

// Data Getters for Autocomplete
function getProvinces() {
    return state.uniqueProvinces;
}

function getAmphoes() {
    const provinceName = addressInputs.province.value;
    if (!provinceName) return [];
    return [
        ...new Set(
            state.addressData
                .filter((d) => d.province === provinceName)
                .map((d) => d.amphoe),
        ),
    ].sort();
}

function getTambons() {
    const provinceName = addressInputs.province.value;
    const amphoeName = addressInputs.amphoe.value;
    if (!provinceName || !amphoeName) return [];

    // Removed zipcode filtering as it restricts Tambon selection when editing a site.
    return [
        ...new Set(
            state.addressData
                .filter((d) => d.province === provinceName && d.amphoe === amphoeName)
                .map((d) => d.district),
        ),
    ].sort();
}

// --- Init Address --
// call this in init() or loadAddressData
function initAddressAutocompletes() {
    setupAutocomplete(
        "input-province",
        "dropdown-province",
        getProvinces,
        handleProvinceSelect,
        "ค้นหา...",
        true,
        0,
    );
    setupAutocomplete(
        "input-amphoe",
        "dropdown-amphoe",
        getAmphoes,
        handleAmphoeSelect,
        "ค้นหา...",
        true,
        0,
    );
    setupAutocomplete(
        "input-tambon",
        "dropdown-tambon",
        getTambons,
        handleTambonSelect,
        "ค้นหา...",
        true,
        0,
    );

    // Keep zipcode logic?
    // The existing 'input' listener works if fields are inputs.
}

// --- Init Site Autocompletes ---
function initSiteAutocompletes() {
    // Hospital autocomplete
    initHospitalAutocomplete();
    const siteFilterInput = document.getElementById("site-filter-input");
    if (siteFilterInput) {
        siteFilterInput.addEventListener("input", () => {
            const filterHidden = document.getElementById("site-filter");
            if (filterHidden) {
                filterHidden.value = "all";
            }
            renderCurrentView();
        });
    }

    // 2. Log Maintenance Site Select
    setupAutocomplete(
        "log-site-input",
        "dropdown-log-site",
        () => state.sites.map((s) => (s.siteCode ? `${s.siteCode} - ${s.name}` : s.name)).sort(),
        (displayName) => {
            const site = state.sites.find((s) => {
                const display = s.siteCode ? `${s.siteCode} - ${s.name}` : s.name;
                return display === displayName;
            });
            if (site && selects.logSiteHidden) {
                selects.logSiteHidden.value = site.id;
            }
        },
        "ค้นหาอุปกรณ์...",
        true,
        0,
    );

    // 3. Log Maintenance Details Autocomplete (New)
    setupAutocomplete(
        "log-details-input",
        "dropdown-log-details",
        () => {
            // Get unique details from all logs
            const details = state.logs
                .map((l) => l.details)
                .filter((d) => d) // Remove null/undefined/empty
                .map((d) => d.trim());
            return [...new Set(details)].sort();
        },
        (val) => {
            console.log("Selected detail:", val);
        },
        "ค้นหา...",
        false, // strict = false for details
    );

    // Removed deprecated input-agency setup since it's now a native select
}


async function loadAddressData() {
    // 1. Try reading from localStorage first (synchronous & instant)
    try {
        const cachedData = localStorage.getItem("cached_thai_address_data");
        const cachedProvinces = localStorage.getItem("cached_thai_provinces");
        if (cachedData && cachedProvinces) {
            state.addressData = JSON.parse(cachedData);
            state.uniqueProvinces = JSON.parse(cachedProvinces);
            initAddressAutocompletes();
            console.log("Loaded Thai address data from localStorage cache");
            return;
        }
    } catch (e) {
        console.warn("Failed to read address data cache from localStorage:", e);
    }

    // 2. Fetch asynchronously in the background if not cached
    try {
        const response = await fetch(
            "https://cdn.jsdelivr.net/gh/kongvut/thai-province-data@master/api/latest/province_with_district_and_sub_district.json",
        );
        const rawData = await response.json();

        const flatData = [];

        rawData.forEach((prov) => {
            const provinceName = prov.name_th;
            if (prov.districts) {
                prov.districts.forEach((dist) => {
                    const amphoeName = dist.name_th;
                    if (dist.sub_districts) {
                        dist.sub_districts.forEach((sub) => {
                            flatData.push({
                                province: provinceName,
                                amphoe: amphoeName,
                                district: sub.name_th,
                                zipcode: sub.zip_code ? String(sub.zip_code) : "",
                            });
                        });
                    }
                });
            }
        });

        state.addressData = flatData;

        state.uniqueProvinces = [
            ...new Set(state.addressData.map((item) => item.province)),
        ].sort();
        initAddressAutocompletes(); // Init new logic

        // Save to cache for next load
        try {
            localStorage.setItem("cached_thai_address_data", JSON.stringify(flatData));
            localStorage.setItem("cached_thai_provinces", JSON.stringify(state.uniqueProvinces));
            console.log("Cached Thai address data to localStorage");
        } catch (cacheErr) {
            console.warn("Failed to cache address data to localStorage:", cacheErr);
        }
    } catch (error) {
        console.error("Failed to load address data from API:", error);

        // Minor Fallback to old behavior if network blocked
        try {
            console.warn("Falling back to local thai_address.json");
            if (typeof THAI_ADDRESS_DATA !== "undefined") {
                state.addressData = THAI_ADDRESS_DATA;
            } else {
                const response = await fetch("thai_address.json");
                state.addressData = await response.json();
            }
            state.uniqueProvinces = [
                ...new Set(state.addressData.map((item) => item.province)),
            ].sort();
            initAddressAutocompletes();
        } catch (fallbackError) {
            console.error("Total failure to load address data:", fallbackError);
            await showDialog("ไม่สามารถโหลดข้อมูลที่อยู่ได้ กรุณารีเฟรชหน้าจอ");
        }
    }
}





async function getApiAgencies() {
    if (cachedApiAgencies) {
        return cachedApiAgencies;
    }

    try {
        console.log("Loading organizations from lao.csv...");
        const response = await fetch("lao.csv");
        const csvText = await response.text();

        // Parse CSV
        const lines = csvText.split("\n");
        const agencies = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV line (handle quoted fields)
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!matches || matches.length < 5) continue;

            const [order, code, name, amphur, province] = matches.map((m) =>
                m.replace(/^"|"$/g, ""),
            );

            // Extract org type and clean name
            let orgType = "";
            let cleanName = name;

            if (name.startsWith("องค์การบริหารส่วนจังหวัด")) {
                orgType = "อบจ.";
                cleanName = name.replace("องค์การบริหารส่วนจังหวัด", "").trim();
            } else if (name.startsWith("เทศบาลนคร")) {
                orgType = "เทศบาลนคร";
                cleanName = name.replace("เทศบาลนคร", "").trim();
            } else if (name.startsWith("เทศบาลเมือง")) {
                orgType = "เทศบาลเมือง";
                cleanName = name.replace("เทศบาลเมือง", "").trim();
            } else if (name.startsWith("เทศบาลตำบล")) {
                orgType = "เทศบาลตำบล";
                cleanName = name.replace("เทศบาลตำบล", "").trim();
            } else if (name.startsWith("องค์การบริหารส่วนตำบล")) {
                orgType = "อบต.";
                cleanName = name.replace("องค์การบริหารส่วนตำบล", "").trim();
            }

            agencies.push({
                ORG_CODE: code,
                ORG_NAME: cleanName,
                ORG_TYPE: orgType,
                AMPHUR_NAME: amphur,
                PROVINCE_NAME: province,
            });
        }

        cachedApiAgencies = agencies;
        console.log(
            `✓ Loaded ${cachedApiAgencies.length} organizations from lao.csv`,
        );

        // Show unique org types
        const orgTypes = [
            ...new Set(agencies.map((a) => a.ORG_TYPE).filter((t) => t)),
        ];
        console.log(`📋 Organization types:`, orgTypes);

        return cachedApiAgencies;
    } catch (e) {
        console.error("Failed to load lao.csv:", e);
        cachedApiAgencies = [];
        return cachedApiAgencies;
    }
}

// --- Agency Autocomplete State ---
let agencyOptions = []; // current list of {display, value} for autocomplete

function renderAgencyDropdown(query) {
    const dropdown = document.getElementById("dropdown-agency");
    const hiddenInput = document.getElementById("input-agency");
    const textInput = document.getElementById("input-agency-text");
    const wrapper = textInput?.closest('.autocomplete-wrapper');
    if (!dropdown) return;

    const q = (query || "").toLowerCase().trim();
    const filtered = q
        ? agencyOptions.filter(
            (a) =>
                a.display.toLowerCase().includes(q) ||
                (a.location || "").toLowerCase().includes(q),
        )
        : agencyOptions;

    if (filtered.length === 0) {
        dropdown.innerHTML =
            '<div class="autocomplete-item" style="color:var(--text-muted); cursor:default;">ไม่พบหน่วยงาน</div>';
    } else {
        dropdown.innerHTML = filtered
            .slice(0, 60)
            .map(
                (a) =>
                    `<div class="autocomplete-item" data-value="${a.value.replace(/"/g, "&quot;")}">${a.display}${a.location ? `<small style="color:var(--text-muted);display:block;font-size:0.8em">${a.location}</small>` : ""}</div>`,
            )
            .join("");
    }

    dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
        item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const val = item.dataset.value;
            if (textInput)
                textInput.value = item.querySelector("small")
                    ? item.childNodes[0].textContent
                    : item.textContent;
            if (hiddenInput) hiddenInput.value = val;
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
        });
    });

    dropdown.classList.remove("hidden");
    if (wrapper) wrapper.classList.add("active");
}

function initAgencyAutocomplete() {
    const textInput = document.getElementById("input-agency-text");
    const dropdown = document.getElementById("dropdown-agency");
    const wrapper = textInput?.closest('.autocomplete-wrapper');
    if (!textInput || !dropdown) return;

    textInput.addEventListener("input", () =>
        renderAgencyDropdown(textInput.value),
    );
    textInput.addEventListener("focus", () => {
        if (agencyOptions.length > 0) renderAgencyDropdown(textInput.value);
    });
    textInput.addEventListener("blur", () => {
        setTimeout(() => {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
        }, 150);
    });
}

// ─── Line Item Helpers ───────────────────────────────────────────────────────


async function setupAgencySelect() {
    const textInput = document.getElementById("input-agency-text");
    if (textInput) textInput.placeholder = "กรุณาเลือกจังหวัดและอำเภอก่อน";
    agencyOptions = [];
    initAgencyAutocomplete();
}

async function loadAllAgencies() {
    const textInput = document.getElementById("input-agency-text");
    if (!textInput) return;

    if (!cachedApiAgencies) {
        textInput.placeholder = "กำลังโหลดข้อมูล...";
        await getApiAgencies();
    }

    if (!cachedApiAgencies || cachedApiAgencies.length === 0) {
        textInput.placeholder = "ไม่สามารถโหลดข้อมูลหน่วยงานได้";
        return;
    }

    const all = [];

    cachedApiAgencies.forEach((item) => {
        if (item.ORG_NAME) {
            const displayName = `${item.ORG_TYPE || ""}${item.ORG_NAME}`.trim();
            const location =
                `อ.${item.AMPHUR_NAME || ""} จ.${item.PROVINCE_NAME || ""}`.trim();
            all.push({ display: displayName, value: displayName, location });
        }
    });

    all.sort((a, b) => a.display.localeCompare(b.display, "th"));
    agencyOptions = all;
    textInput.placeholder = "ค้นหาหน่วยงาน...";
}

async function filterAgenciesByLocation(provinceName, districtName) {
    const textInput = document.getElementById("input-agency-text");
    const hiddenInput = document.getElementById("input-agency");
    if (!textInput) return;

    if (!provinceName || !districtName) {
        agencyOptions = [];
        textInput.placeholder = "กรุณาเลือกจังหวัดและอำเภอก่อน";
        textInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
        return;
    }

    if (!cachedApiAgencies) {
        textInput.placeholder = "กำลังโหลดข้อมูล...";
        await getApiAgencies();
    }

    if (!cachedApiAgencies || cachedApiAgencies.length === 0) {
        textInput.placeholder = "ไม่สามารถโหลดข้อมูลหน่วยงานได้";
        return;
    }

    const normalize = (name, prefix) =>
        name.replace(new RegExp(`^${prefix}`), "").trim();
    const selProvince = normalize(provinceName, "จ\\.");
    const selDistrict = normalize(districtName, "อ\\.")
        .replace(/^อำเภอ/, "")
        .trim();

    const filtered = [];

    cachedApiAgencies.forEach((item) => {
        if (item.ORG_NAME && item.PROVINCE_NAME) {
            const itemProvince = normalize(item.PROVINCE_NAME, "จ\\.");
            const itemDistrict = item.AMPHUR_NAME
                ? normalize(item.AMPHUR_NAME, "อ\\.")
                    .replace(/^อำเภอ/, "")
                    .trim()
                : "";

            if (itemProvince === selProvince && itemDistrict === selDistrict) {
                const displayName = `${item.ORG_TYPE || ""}${item.ORG_NAME}`.trim();
                filtered.push({
                    display: displayName,
                    value: displayName,
                    location: "",
                });
            }
        }
    });

    filtered.sort((a, b) => a.display.localeCompare(b.display, "th"));
    agencyOptions = filtered;

    // Preserve current value if still valid
    const currentVal = hiddenInput ? hiddenInput.value : "";
    if (currentVal && !filtered.find((a) => a.value === currentVal)) {
        textInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
    }

    textInput.placeholder =
        filtered.length > 0 ? "ค้นหาหน่วยงาน..." : "ไม่พบหน่วยงานในพื้นที่นี้";
}




// --- Hospital Autocomplete & Helpers ---
// --- Auto-populate Line Items Datalist ---
function updateLogDetailsDatalist() {
    const datalist = document.getElementById("log-details-list");
    if (!datalist) return;

    // Collect unique items from lineItems across all logs
    const items = new Set();
    state.logs.forEach(log => {
        if (log.lineItems && log.lineItems.length > 0) {
            log.lineItems.forEach(li => {
                if (li.item && li.item.trim() !== "" && !li.item.includes("α╕ïα╣êα╕¡α╕íα╕Üα╕│α╕úα╕╕α╕çα╕òα╕▓α╕íα╕úα╕¡α╕Ü") && !li.item.includes("Maintenance Cycle")) {
                    items.add(li.item.trim());
                }
            });
        }
    });

    datalist.innerHTML = Array.from(items)
        .sort()
        .map(item => `<option value="${item.replace(/"/g, "&quot;")}">`)
        .join("");
}

// --- View Actions ---



// --- Site Name Auto-Generation ---
function updateSiteName() {
    // Device name is entered manually ΓÇö no auto-generation needed
}

function setupSiteNameAutoGeneration() {
    // No-op for device manager
}

function updateSiteFieldDataLists() {
    const fields = ["deviceType", "brand", "model", "picName"];
    fields.forEach(field => {
        setupAutocomplete(
            `input-${field}`,
            `dropdown-${field}`,
            () => {
                let options = [...new Set(state.sites.map(s => s[field]).filter(Boolean))];
                if (field === 'deviceType') {
                    if (!options.includes('α╣Çα╕äα╕úα╕╖α╣êα╕¡α╕çα╣Çα╕èα╣êα╕▓')) {
                        options.push('α╣Çα╕äα╕úα╕╖α╣êα╕¡α╕çα╣Çα╕èα╣êα╕▓');
                    }
                }
                return options.sort((a, b) => a.localeCompare(b, 'th'));
            },
            () => { },
            "α╕äα╣ëα╕Öα╕½α╕▓...",
            false,
            0
        );
    });
}

function initHospitalAutocomplete() {
    const textInput = document.getElementById("input-hospital-text");
    const dropdown = document.getElementById("dropdown-hospital");
    if (!textInput || !dropdown) return;

    const wrapper = textInput.closest('.autocomplete-wrapper');
    const hospitals = (typeof HOSPITAL_LIST !== 'undefined') ? HOSPITAL_LIST : [];

    function renderHospitalDropdown(query) {
        const q = query.trim().toLowerCase();

        // Require at least 1 character before showing dropdown
        if (q.length < 1) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        const matches = hospitals.filter(h => h.name.toLowerCase().includes(q)).slice(0, 50);

        if (matches.length === 0) {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
            return;
        }

        dropdown.innerHTML = matches.map(h =>
            `<div class="autocomplete-item" data-value="${h.name}" data-province="${h.province || ''}">${h.name}${h.province ? ` <span style="color:var(--text-muted);font-size:0.8em;">(${h.province})</span>` : ''}</div>`
        ).join('');
        dropdown.classList.remove("hidden");
        if (wrapper) wrapper.classList.add("active");

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                textInput.value = item.dataset.value;
                dropdown.classList.add("hidden");
                if (wrapper) wrapper.classList.remove("active");

                // Auto-fill province if available
                const province = item.dataset.province;
                if (province && addressInputs.province) {
                    addressInputs.province.value = province;
                    handleProvinceSelect(province);
                }
            });
        });
    }

    textInput.addEventListener("input", () => renderHospitalDropdown(textInput.value));
    textInput.addEventListener("focus", () => renderHospitalDropdown(textInput.value));
    textInput.addEventListener("blur", () => {
        setTimeout(() => {
            dropdown.classList.add("hidden");
            if (wrapper) wrapper.classList.remove("active");
        }, 150);
    });
}

// --- Global State for Site Uploads ---
let pendingSiteUploads = [];
let pendingSiteDeletions = [];


export { calculateDuration, setupAutocomplete, handleProvinceSelect, handleAmphoeSelect, handleTambonSelect, getProvinces, getAmphoes, getTambons, initAddressAutocompletes, initSiteAutocompletes, loadAddressData, getApiAgencies, renderAgencyDropdown, initAgencyAutocomplete, setupAgencySelect, loadAllAgencies, filterAgenciesByLocation, initHospitalAutocomplete, updateLogDetailsDatalist, updateSiteFieldDataLists, setupSiteNameAutoGeneration };