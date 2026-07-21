export const views = {
    admin: document.getElementById("admin-view"),
    engineer: document.getElementById("engineer-view"),
    plan: document.getElementById("plan-view"),
    login: document.getElementById("login-view"),
    profile: document.getElementById("profile-view"),
    inventory: document.getElementById("inventory-view"),
};

export const modals = {
    addSite: "modal-add-site",
    logMaintenance: "modal-log-maintenance",
    deleteConfirm: "modal-delete-confirm",
    siteDetails: "modal-site-details",
    logDetails: "modal-log-details",
};

export const grids = {
    sites: document.getElementById("sites-grid"),
    logs: document.getElementById("logs-feed"),
};

export const selects = {
    filterInput: document.getElementById("site-filter-input"),
    filterHidden: document.getElementById("site-filter"),
    logSiteInput: document.getElementById("log-site-input"),
    logSiteHidden: document.getElementById("log-site-select"),

    filterCategory: document.getElementById("filter-category"),
    filterStart: document.getElementById("filter-start-date"),
    filterEnd: document.getElementById("filter-end-date"),
};

export const addressInputs = {
    province: document.getElementById("input-province"),
    amphoe: document.getElementById("input-amphoe"),
    tambon: document.getElementById("input-tambon"),
    moo: document.getElementById("input-moo"),
    zipcode: document.getElementById("input-zipcode"),
    provinceDropdown: document.getElementById("dropdown-province"),
    amphoeDropdown: document.getElementById("dropdown-amphoe"),
    tambonDropdown: document.getElementById("dropdown-tambon"),
};
