

function setupStrictPhoneFormat(input) {
    if (!input) return;

    input.addEventListener("input", function (e) {
        // Allow digits only, remove other chars
        let rawValue = e.target.value.replace(/\D/g, "");

        // Format into groups of 3 digits separated by hyphens (no length limit)
        const parts = [];
        for (let i = 0; i < rawValue.length; i += 3) {
            parts.push(rawValue.substring(i, i + 3));
        }
        const formattedValue = parts.join('-');

        e.target.value = formattedValue;
    });
}

function setupPhoneInputs() {
    // 1. Profile Phone
    const profileInput = document.getElementById("profile-phone");
    if (profileInput) {
        setupStrictPhoneFormat(profileInput); // Add formatting
        if (!window.itiInstances.profile) {
            window.itiInstances.profile = window.intlTelInput(profileInput, {
                initialCountry: "th",
                onlyCountries: ["th"],
                allowDropdown: false,
                utilsScript:
                    "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
                autoInsertDialCode: true,
                nationalMode: true,
            });
        }
    }

    // 2. Site Contact Phone
    const siteInput = document.getElementById("site-contact-phone");
    if (siteInput) {
        setupStrictPhoneFormat(siteInput); // Add formatting
        if (!window.itiInstances.site) {
            window.itiInstances.site = window.intlTelInput(siteInput, {
                initialCountry: "th",
                onlyCountries: ["th"],
                allowDropdown: false,
                utilsScript:
                    "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
                autoInsertDialCode: true,
                nationalMode: true,
            });
        }
    }
}


function validateEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// --- Strict Thai Phone Validation Helper ---
function validateThaiPhone(inputElement, itiInstance) {
    if (!itiInstance || !inputElement.value) return true; // Allow empty if handled elsewhere

    // 1. Get national number (e.g. 081 234 5678)
    // We can rely on input value if nationalMode is true
    const rawValue = inputElement.value.replace(/\D/g, ""); // Digits only

    // 2. Strict Rules:
    // - Must start with '0'
    // - Must be exactly 10 digits
    if (rawValue.length !== 10) return false;
    if (!rawValue.startsWith("0")) return false;

    // 3. Lib Verification (Backup)
    if (!itiInstance.isValidNumber()) return false;

    return true;
}


export { setupStrictPhoneFormat, setupPhoneInputs, validateEmail, validateThaiPhone };