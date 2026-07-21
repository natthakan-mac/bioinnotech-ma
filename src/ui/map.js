import { state } from '../store/state.js';

let siteMap = null;
let siteMarker = null;
let thailandGeoJSON = null;

window.siteMap = siteMap;
window.siteMarker = siteMarker;
window.thailandGeoJSON = thailandGeoJSON;

function initSiteMap() {
    const mapContainer = document.getElementById("map-preview");
    if (!mapContainer) return;

    // Show container
    mapContainer.style.display = "block";

    if (typeof google === "undefined" || !google.maps) {
        console.warn("Google Maps API not loaded yet.");
        return;
    }

    if (!siteMap) {
        // Default to Bangkok if no location
        const defaultCenter = { lat: 13.7563, lng: 100.5018 };

        siteMap = new window.google.maps.Map(mapContainer, {
            center: defaultCenter,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
        });

        // Use AdvancedMarkerElement (replaces deprecated google.maps.Marker)
        const { AdvancedMarkerElement } = google.maps.marker;
        siteMarker = new AdvancedMarkerElement({
            position: defaultCenter,
            map: siteMap,
            gmpDraggable: true,
        });

        // Handle marker drag
        siteMarker.addListener("dragend", function () {
            const pos = siteMarker.position;
            if (pos) {
                // AdvancedMarkerElement position is a LatLng object, use .lat() and .lng() methods
                updateLocationUrlInput(pos.lat(), pos.lng());
            }
        });

        // Handle map click to move marker
        siteMap.addListener("click", function (e) {
            if (e.latLng) {
                siteMarker.position = e.latLng;
                updateLocationUrlInput(e.latLng.lat(), e.latLng.lng());
            }
        });
    } else {
        // Trigger resize just in case container changed visibility
        window.google.maps.event.trigger(siteMap, "resize");
    }

    // Listen to manual URL input changes
    const urlInput = document.getElementById("input-location-url");
    if (urlInput && !urlInput.dataset.listenerAdded) {
        urlInput.dataset.listenerAdded = "true";
        urlInput.addEventListener("input", (e) => {
            const coords = parseLocationUrl(e.target.value);
            if (coords && siteMap && siteMarker) {
                const newPos = new window.google.maps.LatLng(coords.lat, coords.lng);
                siteMap.setCenter(newPos);
                siteMap.setZoom(15);
                siteMarker.position = newPos;
            }
        });
    }
}

function updateLocationUrlInput(lat, lng) {
    const input = document.getElementById("input-location-url");
    if (input) {
        input.value = `https://maps.google.com/?q=${lat},${lng}`;
    }
}

function parseLocationUrl(url) {
    if (!url) return null;
    try {
        // Try to match standard Google Maps q=lat,lon format
        let match = url.match(/q=([-+]?\d*\.\d+|\d+),\s*([-+]?\d*\.\d+|\d+)/);
        if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };

        // Try to match @lat,lon format
        match = url.match(/@([-+]?\d*\.\d+|\d+),\s*([-+]?\d*\.\d+|\d+)/);
        if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    } catch (e) {
        console.warn("Could not parse coordinates from URL", url);
    }
    return null;
}


const provinceTranslationMap = {
    "Amnat Charoen": "อำนาจเจริญ",
    "Ang Thong": "อ่างทอง",
    "Bangkok": "กรุงเทพมหานคร",
    "Bueng Kan": "บึงกาฬ",
    "Buri Ram": "บุรีรัมย์",
    "Chachoengsao": "ฉะเชิงเทรา",
    "Chai Nat": "ชัยนาท",
    "Chaiyaphum": "ชัยภูมิ",
    "Chanthaburi": "จันทบุรี",
    "Chiang Mai": "เชียงใหม่",
    "Chiang Rai": "เชียงราย",
    "Chon Buri": "ชลบุรี",
    "Chumphon": "ชุมพร",
    "Kalasin": "กาฬสินธุ์",
    "Kamphaeng Phet": "กำแพงเพชร",
    "Kanchanaburi": "กาญจนบุรี",
    "Khon Kaen": "ขอนแก่น",
    "Krabi": "กระบี่",
    "Lampang": "ลำปาง",
    "Lamphun": "ลำพูน",
    "Loei": "เลย",
    "Lop Buri": "ลพบุรี",
    "Mae Hong Son": "แม่ฮ่องสอน",
    "Maha Sarakham": "มหาสารคาม",
    "Mukdahan": "มุกดาหาร",
    "Nakhon Nayok": "นครนายก",
    "Nakhon Pathom": "นครปฐม",
    "Nakhon Phanom": "นครพนม",
    "Nakhon Ratchasima": "นครราชสีมา",
    "Nakhon Sawan": "นครสวรรค์",
    "Nakhon Si Thammarat": "นครศรีธรรมราช",
    "Nan": "น่าน",
    "Narathiwat": "นราธิวาส",
    "Nong Bua Lam Phu": "หนองบัวลำภู",
    "Nong Khai": "หนองคาย",
    "Nonthaburi": "นนทบุรี",
    "Pathum Thani": "ปทุมธานี",
    "Pattani": "ปัตตานี",
    "Phangnga": "พังงา",
    "Phatthalung": "พัทลุง",
    "Phayao": "พะเยา",
    "Phetchabun": "เพชรบูรณ์",
    "Phetchaburi": "เพชรบุรี",
    "Phichit": "พิจิตร",
    "Phitsanulok": "พิษณุโลก",
    "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
    "Phrae": "แพร่",
    "Phuket": "ภูเก็ต",
    "Prachin Buri": "ปราจีนบุรี",
    "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
    "Ranong": "ระนอง",
    "Ratchaburi": "ราชบุรี",
    "Rayong": "ระยอง",
    "Roi Et": "ร้อยเอ็ด",
    "Sa Kaeo": "สระแก้ว",
    "Sakon Nakhon": "สกลนคร",
    "Samut Prakan": "สมุทรปราการ",
    "Samut Sakhon": "สมุทรสาคร",
    "Samut Songkhram": "สมุทรสงคราม",
    "Saraburi": "สระบุรี",
    "Satun": "สตูล",
    "Si Sa Ket": "ศรีสะเกษ",
    "Sing Buri": "สิงห์บุรี",
    "Songkhla": "สงขลา",
    "Sukhothai": "สุโขทัย",
    "Suphan Buri": "สุพรรณบุรี",
    "Surat Thani": "สุราษฎร์ธานี",
    "Surin": "สุรินทร์",
    "Tak": "ตาก",
    "Trang": "ตรัง",
    "Trat": "ตราด",
    "Ubon Ratchathani": "อุบลราชธานี",
    "Udon Thani": "อุดรธานี",
    "Uthai Thani": "อุทัยธานี",
    "Uttaradit": "อุตรดิตถ์",
    "Yala": "ยะลา",
    "Yasothon": "ยโสธร"
};

function cleanProvinceName(name) {
    if (!name) return "";
    return name.toString().replace(/^(จังหวัด|จ\.)\s*/, "").trim();
}

async function renderDeviceMap(sitesToRender) {
    const container = document.getElementById("device-map");
    if (!container) return;

    if (typeof d3 === "undefined") {
        console.error("D3.js is not loaded yet.");
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">กำลังโหลดแผนที่ (D3.js ไม่พร้อมใช้งาน)...</div>`;
        return;
    }

    // Create Tooltip if it doesn't exist
    let tooltip = document.getElementById("map-tooltip-element");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "map-tooltip-element";
        tooltip.className = "map-tooltip";
        document.body.appendChild(tooltip);
    }

    // Create Province Hover Tooltip
    let provTooltip = document.getElementById("map-prov-tooltip-element");
    if (!provTooltip) {
        provTooltip = document.createElement("div");
        provTooltip.id = "map-prov-tooltip-element";
        provTooltip.style.position = "absolute";
        provTooltip.style.background = "rgba(15, 23, 42, 0.85)";
        provTooltip.style.color = "white";
        provTooltip.style.padding = "4px 10px";
        provTooltip.style.borderRadius = "6px";
        provTooltip.style.fontSize = "0.75rem";
        provTooltip.style.fontWeight = "500";
        provTooltip.style.pointerEvents = "none";
        provTooltip.style.opacity = 0;
        provTooltip.style.transition = "opacity 0.2s, transform 0.2s";
        provTooltip.style.transform = "scale(0.95)";
        provTooltip.style.zIndex = "1000";
        provTooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        document.body.appendChild(provTooltip);
    }

    try {
        if (!thailandGeoJSON) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i>กำลังโหลดข้อมูลแผนที่ประเทศไทย...</div>`;
            const geojsonUrl = "thailand-provinces.geojson";
            window.thailandGeoJSON = thailandGeoJSON = await d3.json(geojsonUrl);
        }

        container.innerHTML = ""; // Clear loader

        const width = container.clientWidth || 500;
        const height = container.clientHeight || 500;

        const svg = d3.create("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "100%");

        // Setup Map Projection (Mercator) auto-fitted to Thailand GeoJSON
        const projection = d3.geoMercator()
            .fitSize([width - 40, height - 40], thailandGeoJSON);

        const pathGenerator = d3.geoPath().projection(projection);

        // Group element for zoom & panning
        const g = svg.append("g");

        // 1. Calculate site colors based on Scheduled PM/Repair this month
        const siteColorMap = {};
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (state.logs) {
            state.logs.forEach(log => {
                if (log.date) {
                    const logDate = new Date(log.date);
                    if (!isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                        if (log.category === "ซ่อม") {
                            siteColorMap[log.siteId] = "#dc2626"; // Red (takes priority)
                        } else if (log.category === "บำรุงรักษาตามรอบ" && siteColorMap[log.siteId] !== "#dc2626") {
                            siteColorMap[log.siteId] = "#0369a1"; // Blue
                        }
                    }
                }
            });
        }

        // Map provinces
        g.selectAll("path")
            .data(thailandGeoJSON.features)
            .enter()
            .append("path")
            .attr("class", "map-province")
            .attr("d", pathGenerator)
            .style("fill", null)
            .on("mouseover", function (event, d) {
                const enName = d.properties.name;
                const thName = provinceTranslationMap[enName] || enName;
                d3.select(provTooltip)
                    .text(thName)
                    .style("opacity", 1)
                    .style("transform", "scale(1)");
            })
            .on("mousemove", function (event) {
                d3.select(provTooltip)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(provTooltip)
                    .style("opacity", 0)
                    .style("transform", "scale(0.95)");
            });

        // Compute province centroid map for quick access
        const provinceCentroids = {};
        thailandGeoJSON.features.forEach(feature => {
            const enName = feature.properties.name;
            const thName = provinceTranslationMap[enName];
            if (thName) {
                const pixelCentroid = pathGenerator.centroid(feature);
                provinceCentroids[cleanProvinceName(thName)] = projection.invert(pixelCentroid);
            }
        });

        // Draw Device Dots
        const dotsData = [];
        const locationJitter = {}; // Track duplicate coordinates to apply jitter

        sitesToRender.forEach(site => {
            let lat = null;
            let lng = null;

            // 1. Try parsed coordinates
            if (site.locationUrl) {
                const parsed = parseLocationUrl(site.locationUrl);
                if (parsed) {
                    lat = parsed.lat;
                    lng = parsed.lng;
                }
            }

            // 2. Fallback to province centroid
            if (lat === null || lng === null) {
                const cleanProvince = cleanProvinceName(site.province);
                const centroid = provinceCentroids[cleanProvince];
                if (centroid) {
                    lng = centroid[0];
                    lat = centroid[1];
                }
            }

            if (lat !== null && lng !== null) {
                // Apply jitter to avoid overlaps for locations that are very close (~2km radius)
                let clusterFound = null;
                for (let key in locationJitter) {
                    const cluster = locationJitter[key];
                    // Calculate rough distance in degrees. 0.02 degrees is roughly 2.2 km.
                    const dist = Math.sqrt(Math.pow(lat - cluster.lat, 2) + Math.pow(lng - cluster.lng, 2));
                    if (dist < 0.02) {
                        clusterFound = cluster;
                        break;
                    }
                }

                if (!clusterFound) {
                    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
                    const projected = projection([lng, lat]);
                    clusterFound = {
                        lat: lat,
                        lng: lng,
                        count: 0,
                        sites: [], // Store all sites in this cluster
                        centerX: projected ? projected[0] : 0,
                        centerY: projected ? projected[1] : 0
                    };
                    locationJitter[coordKey] = clusterFound;
                }

                clusterFound.sites.push(site);
                const offsetCount = clusterFound.count++;

                // Add spiral/circular jitter based on repeat count
                let offsetX = 0;
                let offsetY = 0;
                if (offsetCount > 0) {
                    const angle = (offsetCount * 0.8) * Math.PI; // Spiral angle
                    // Increased jitter spread slightly to accommodate mobile zooming
                    const radius = 8 + (offsetCount * 2.5);
                    offsetX = Math.cos(angle) * radius;
                    offsetY = Math.sin(angle) * radius;
                }

                if (clusterFound.centerX || clusterFound.centerY) {
                    dotsData.push({
                        site: site,
                        cluster: clusterFound,
                        cx: clusterFound.centerX + offsetX,
                        cy: clusterFound.centerY + offsetY,
                        pinColor: siteColorMap[site.id] || null
                    });
                }
            }
        });

        // Helper functions for radius to keep pins tap-able on mobile when zoomed
        const getDotRadius = (k) => {
            const isMobile = window.innerWidth <= 768;
            return isMobile ? 6 / Math.sqrt(k) : 6 / k;
        };
        const getHoverRadius = (k) => {
            const isMobile = window.innerWidth <= 768;
            return isMobile ? 9 / Math.sqrt(k) : 9 / k;
        };

        // Pulse Rings for pins meeting conditions
        g.selectAll("circle.map-pulse-ring")
            .data(dotsData.filter(d => d.pinColor))
            .enter()
            .append("circle")
            .attr("class", "map-pulse-ring")
            .attr("cx", d => d.cx)
            .attr("cy", d => d.cy)
            .attr("r", getDotRadius(1))
            .attr("vector-effect", "non-scaling-stroke")
            .style("fill", "none")
            .style("stroke", d => d.pinColor);

        // Plot dots
        const dots = g.selectAll("circle.map-device-dot")
            .data(dotsData)
            .enter()
            .append("circle")
            .attr("class", "map-device-dot")
            .attr("cx", d => d.cx)
            .attr("cy", d => d.cy)
            .attr("r", getDotRadius(1))
            .attr("vector-effect", "non-scaling-stroke")
            .style("fill", d => d.pinColor || "")
            .on("mouseover", function (event, d) {
                const currentK = d3.zoomTransform(svg.node()).k;
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", getHoverRadius(currentK))
                    .style("fill", "#10b981")
                    .style("filter", "drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))");

                const cleanProvince = cleanProvinceName(d.site.province) || "-";
                const cleanDistrict = d.site.district || "-";
                const cleanSubdistrict = d.site.subdistrict || "-";
                const detailLoc = [cleanSubdistrict, cleanDistrict, cleanProvince].filter(item => item && item !== "-").join(", ");

                const tooltipHtml = `
                    <div class="map-tooltip-header">${d.site.name}</div>
                    <div class="map-tooltip-body">
                        <div class="map-tooltip-item"><strong>รหัสเครื่อง:</strong> ${d.site.siteCode || "-"}</div>
                        <div class="map-tooltip-item"><strong>อุปกรณ์:</strong> ${d.site.deviceType || "-"}</div>
                        <div class="map-tooltip-item"><strong>รุ่น/ยี่ห้อ:</strong> ${[d.site.brand, d.site.model].filter(Boolean).join(" ") || "-"}</div>
                        <div class="map-tooltip-item"><strong>สถานที่:</strong> ${detailLoc}</div>
                        <div class="map-tooltip-item" style="color:var(--primary-color); font-weight:600; margin-top:4px; font-size:0.75rem;"><i class="fa-solid fa-circle-info"></i> แตะเพื่อดูรายละเอียดเครื่อง</div>
                    </div>
                `;

                d3.select(tooltip)
                    .html(tooltipHtml)
                    .style("opacity", 1)
                    .style("transform", "scale(1)");
            })
            .on("mousemove", function (event) {
                d3.select(tooltip)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function (event, d) {
                const currentK = d3.zoomTransform(svg.node()).k;
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", getDotRadius(currentK))
                    .style("fill", d => d.pinColor || "")
                    .style("filter", "");

                d3.select(tooltip)
                    .style("opacity", 0)
                    .style("transform", "scale(0.95)");
            })
            .on("click", function (event, d) {
                d3.select(tooltip).style("opacity", 0);

                // Find all visually overlapping sites based on current zoom
                const currentK = d3.zoomTransform(svg.node()).k;
                const threshold = getDotRadius(currentK) * 2.5;

                const overlappingSites = [];
                dotsData.forEach(other => {
                    const dist = Math.sqrt(Math.pow(d.cx - other.cx, 2) + Math.pow(d.cy - other.cy, 2));
                    if (dist <= threshold) {
                        overlappingSites.push(other.site);
                    }
                });

                if (overlappingSites.length > 1) {
                    // Create overlay and popup styled to match site system
                    const overlay = document.createElement("div");
                    overlay.className = "modal-overlay modal-layer-top";

                    const popup = document.createElement("div");
                    popup.className = "modal glass-panel";
                    popup.style.maxWidth = "450px";
                    popup.style.width = "90%";
                    popup.style.maxHeight = "80vh";
                    popup.style.display = "flex";
                    popup.style.flexDirection = "column";
                    popup.style.padding = "2rem";

                    // Helpers for badges in the popup to match site style
                    const getCategoryBadge = (cat) => {
                        let catColor = '#64748b';
                        let catBg = 'rgba(100,116,139,0.12)';
                        if (typeof isMaCategory === "function" && isMaCategory(cat)) {
                            catColor = '#0369a1';
                            catBg = '#e0f2fe';
                        } else if (cat === "ติดตั้ง") {
                            catColor = '#15803d';
                            catBg = '#dcfce7';
                        } else if (cat === "รื้อถอน") {
                            catColor = '#b45309';
                            catBg = '#fef3c7';
                        } else if (cat === "ซ่อม") {
                            catColor = '#dc2626';
                            catBg = '#fee2e2';
                        } else if (cat === "ตามสัญญาจ้าง") {
                            catColor = '#7c3aed';
                            catBg = '#ede9fe';
                        } else if (cat === "ตามใบสั่งซื้อ") {
                            catColor = '#0891b2';
                            catBg = '#cffafe';
                        }
                        return `<span style="background:${catBg}; color:${catColor}; padding:2.5px 8px; border-radius:12px; font-size:0.72rem; font-weight:600; white-space:nowrap;">${cat}</span>`;
                    };

                    const getStatusBadge = (status) => {
                        const statusColors = {
                            Open: { bg: "rgba(234,179,8,0.15)", color: "#ca8a04", label: "เปิดงาน" },
                            "On Process": { bg: "rgba(249,115,22,0.15)", color: "#f97316", label: "กำลังดำเนินการ" },
                            Cancel: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "ยกเลิก" },
                            Done: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "เสร็จสิ้น" },
                            "Case Closed": { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "ปิดเคส" },
                            Completed: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", label: "เสร็จสิ้น" }
                        };
                        const s = statusColors[status] || {
                            bg: "rgba(100,116,139,0.15)",
                            color: "var(--text-muted)",
                            label: status || "เปิดงาน"
                        };
                        return `<span style="background:${s.bg}; color:${s.color}; padding:2.5px 8px; border-radius:12px; font-size:0.72rem; font-weight:600; white-space:nowrap;">${s.label}</span>`;
                    };

                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();

                    let casesHtml = "";
                    let devicesHtml = "";

                    overlappingSites.forEach(s => {
                        const siteLogs = (state.logs || []).filter(log => {
                            if (log.siteId === s.id && log.date) {
                                const logDate = new Date(log.date);
                                return !isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear && (log.category === "ซ่อม" || log.category === "บำรุงรักษาตามรอบ");
                            }
                            return false;
                        });

                        if (siteLogs.length > 0) {
                            siteLogs.forEach(log => {
                                const isRepair = log.category === "ซ่อม";
                                const borderColor = isRepair ? "#dc2626" : "#0369a1";

                                casesHtml += `
                                    <div class="cluster-item" data-id="${s.id}" data-log-id="${log.id}" style="display: flex; flex-direction: column; padding: 1rem; border: 1.5px solid var(--border-color); border-left: 4px solid ${borderColor} !important; border-radius: var(--radius-md); cursor: pointer; background: var(--surface-bg); transition: all 0.2s ease; position: relative; box-shadow: var(--shadow-sm); margin-bottom: 2px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <div style="font-weight: 700; color: var(--text-color); font-size: 1.2rem; line-height: 1.3; padding-right: 4px;">${s.name}</div>
                                            <div style="flex-shrink: 0;">${getCategoryBadge(log.category)}</div>
                                        </div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
                                            <div><i class="fa-solid fa-hashtag" style="width: 14px; text-align: center;"></i> รหัสเคส: ${log.caseId ? log.caseId.replace('CASE-', '') : '-'}</div>
                                            <div><i class="fa-solid fa-tag" style="width: 14px; text-align: center;"></i> ยี่ห้อ/รุ่น: ${[s.brand, s.model].filter(Boolean).join(' ') || '-'}</div>
                                            <div><i class="fa-solid fa-barcode" style="width: 14px; text-align: center;"></i> Serial No: ${s.serialNumber || '-'}</div>
                                            <div style="margin-top: 0.4rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--bg-color); padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
                                                <span style="font-weight: 500; font-size: 0.75rem; color: var(--text-color);"><i class="fa-regular fa-calendar" style="color: var(--text-muted); margin-right: 4px;"></i>วันที่: ${new Date(log.date).toLocaleDateString('th-TH')}</span>
                                                ${log.status ? getStatusBadge(log.status) : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                        } else {
                            devicesHtml += `
                                <div class="cluster-item" data-id="${s.id}" style="display: flex; flex-direction: column; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: var(--surface-bg); transition: all 0.2s ease; box-shadow: var(--shadow-sm); margin-bottom: 2px;">
                                    <div style="font-weight: 700; color: var(--text-color); font-size: 1.2rem; line-height: 1.3; margin-bottom: 0.5rem;">${s.name}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
                                        <div><i class="fa-solid fa-hashtag" style="width: 14px; text-align: center;"></i> รหัสเครื่อง: ${s.siteCode || '-'}</div>
                                        <div><i class="fa-solid fa-tag" style="width: 14px; text-align: center;"></i> ยี่ห้อ/รุ่น: ${[s.brand, s.model].filter(Boolean).join(' ') || '-'}</div>
                                        <div><i class="fa-solid fa-barcode" style="width: 14px; text-align: center;"></i> Serial No: ${s.serialNumber || '-'}</div>
                                    </div>
                                </div>
                            `;
                        }
                    });

                    let html = `
                    <div class="modal-header" style="margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="color: var(--primary-color); margin: 0; font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-map-location-dot" style="color: var(--primary-color);"></i> อุปกรณ์ในบริเวณนี้
                            </h3>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0 0 0; font-weight: 400;">
                                พบอุปกรณ์ทั้งหมด ${overlappingSites.length} เครื่องใกล้เคียงกัน
                            </p>
                        </div>
                        <button class="close-modal" id="close-cluster-popup" style="padding: 0; line-height: 1; font-size: 1.5rem; margin-top: -4px;">&times;</button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; flex: 1;">`;

                    if (casesHtml) {
                        html += `
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                            <i class="fa-solid fa-wrench" style="color: #dc2626; font-size: 0.75rem;"></i> งานซ่อมบำรุงในเดือนนี้
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px;">
                            ${casesHtml}
                        </div>`;
                    }

                    if (devicesHtml) {
                        html += `
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; margin-bottom: 2px; ${casesHtml ? 'margin-top: 10px;' : ''}">
                            <i class="fa-solid fa-desktop" style="color: var(--primary-color); font-size: 0.75rem;"></i> รายการเครื่องทั้งหมด
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${devicesHtml}
                        </div>`;
                    }

                    html += `</div>`;

                    popup.innerHTML = html;
                    overlay.appendChild(popup);
                    document.body.appendChild(overlay);

                    document.getElementById("close-cluster-popup").onclick = () => document.body.removeChild(overlay);
                    overlay.onclick = (e) => {
                        if (e.target === overlay) document.body.removeChild(overlay);
                    };

                    const items = popup.querySelectorAll('.cluster-item');
                    items.forEach(item => {
                        item.onclick = function () {
                            document.body.removeChild(overlay);
                            const logId = this.getAttribute('data-log-id');
                            if (logId && typeof viewLogDetails === "function") {
                                viewLogDetails(logId);
                            } else if (typeof viewSiteDetails === "function") {
                                viewSiteDetails(this.getAttribute('data-id'));
                            }
                        };
                        item.onmouseover = function () {
                            this.style.transform = "translateY(-2px)";
                            this.style.boxShadow = "var(--shadow-md)";
                            this.style.borderColor = "var(--primary-color)";
                        };
                        item.onmouseout = function () {
                            this.style.transform = "none";
                            this.style.boxShadow = "var(--shadow-sm)";
                            this.style.borderColor = "var(--border-color)";
                        };
                    });
                } else {
                    let logOpened = false;
                    if (d.pinColor && state.logs) {
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();

                        const targetLog = state.logs.find(log => {
                            if (log.siteId === d.site.id && log.date) {
                                const logDate = new Date(log.date);
                                if (!isNaN(logDate.getTime()) && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                                    if (d.pinColor === "#dc2626" && log.category === "ซ่อม") return true;
                                    if (d.pinColor === "#0369a1" && log.category === "บำรุงรักษาตามรอบ") return true;
                                }
                            }
                            return false;
                        });

                        if (targetLog && typeof viewLogDetails === "function") {
                            viewLogDetails(targetLog.id);
                            logOpened = true;
                        }
                    }

                    if (!logOpened && typeof viewSiteDetails === "function") {
                        viewSiteDetails(d.site.id);
                    }
                }
            });

        // Add D3 Zoom support
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                const k = event.transform.k;

                // Keep dots the same visual size on screen when zooming (or scale slightly on mobile)
                g.selectAll("circle.map-device-dot")
                    .attr("r", getDotRadius(k));
                g.selectAll("circle.map-pulse-ring")
                    .attr("r", getDotRadius(k));

                // Keep province borders thin
                g.selectAll("path.map-province")
                    .style("stroke-width", (1 / k) + "px");
            });

        svg.call(zoom);

        // Auto-fit zoom to filtered device pins
        if (dotsData.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            dotsData.forEach(d => {
                if (d.cx < minX) minX = d.cx;
                if (d.cx > maxX) maxX = d.cx;
                if (d.cy < minY) minY = d.cy;
                if (d.cy > maxY) maxY = d.cy;
            });

            if (minX !== Infinity) {
                const dx = maxX - minX;
                const dy = maxY - minY;
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                // Adjust zoom level dynamically based on data bounds spread
                let scale;
                if (dx < 12 && dy < 12) {
                    scale = 3.5; // Single city or close group zoom-in
                } else {
                    scale = Math.max(1, Math.min(5, 0.8 / Math.max(dx / width, dy / height)));
                }

                // If showing all sites, reset zoom to scale 1
                const isAllSites = sitesToRender.length === state.sites.length;
                const targetScale = isAllSites ? 1 : scale;
                const targetTranslate = isAllSites
                    ? [0, 0]
                    : [width / 2 - targetScale * centerX, height / 2 - targetScale * centerY];

                const initialTransform = d3.zoomIdentity
                    .translate(targetTranslate[0], targetTranslate[1])
                    .scale(targetScale);

                svg.call(zoom.transform, initialTransform);
            }
        }

        container.appendChild(svg.node());

        // Create Reset Zoom Button overlay
        const resetBtn = document.createElement("button");
        resetBtn.id = "btn-reset-map-zoom";
        resetBtn.className = "btn-secondary";
        resetBtn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>ล้างซูม</span>';
        resetBtn.style.position = "absolute";
        resetBtn.style.top = "10px";
        resetBtn.style.right = "10px";
        resetBtn.style.zIndex = "10";
        resetBtn.style.padding = "6px 12px";
        resetBtn.style.borderRadius = "8px";
        resetBtn.style.fontSize = "0.75rem";
        resetBtn.style.fontWeight = "600";
        resetBtn.style.display = "flex";
        resetBtn.style.alignItems = "center";
        resetBtn.style.gap = "4px";
        resetBtn.style.background = "var(--card-bg)";
        resetBtn.style.border = "1px solid var(--glass-border)";
        resetBtn.style.color = "var(--text-color)";
        resetBtn.style.cursor = "pointer";
        resetBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        resetBtn.style.transition = "all 0.2s ease";

        resetBtn.addEventListener("mouseover", () => {
            resetBtn.style.background = "rgba(0, 0, 0, 0.04)";
        });
        resetBtn.addEventListener("mouseout", () => {
            resetBtn.style.background = "var(--card-bg)";
        });

        resetBtn.addEventListener("click", () => {
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });

        container.appendChild(resetBtn);

    } catch (error) {
        console.error("Error rendering D3 Thailand map:", error);
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-circle-exclamation" style="color:var(--danger-color); margin-right:8px;"></i>เกิดข้อผิดพลาดในการโหลดแผนที่: ${error.message}</div>`;
    }
}

window.renderDeviceMap = renderDeviceMap;


export { initSiteMap, updateLocationUrlInput, parseLocationUrl, provinceTranslationMap, cleanProvinceName, renderDeviceMap };