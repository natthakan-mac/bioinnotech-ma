
/**
 * Generates a blank ISO template PDF based on the current layout.
 * Used for ISO document registration.
 */
async function exportBlankISO(type) {
    console.log('[ISO] Exporting blank template:', type);
    
    const mockSite = {
        name: '..................................................',
        siteCode: '..........',
        subdistrict: '..........',
        district: '..........',
        province: '..........',
        installLocation: '..........',
        brand: '..........',
        model: '..........',
        serialNumber: '..........',
        deviceType: '..........',
        insuranceStartDate: '..........',
        insuranceEndDate: '..........',
        maintenanceCycle: '..........',
        contactPhone: '..........',
        picName: '..........'
    };

    const mockLog = {
        id: 'blank-' + Date.now(),
        caseId: 'CASE-XXXXXX',
        date: new Date().toISOString(),
        category: type === 'install' ? 'ติดตั้ง' : (type === 'ma' ? 'Maintenance' : 'ซ่อม'),
        status: 'Open',
        recorderId: '',
        recordedBy: '....................',
        responderId: '',
        siteId: 'blank',
        details: '',
        lineItems: [],
        timestamp: new Date().toISOString(),
        customerName: '....................',
        customerPhone: '....................',
        customerPosition: '....................',
        _isBlank: true,
        _mockSite: mockSite,
        repairChecklist: type === 'repair' ? Array(10).fill({ label: '........................................', status: '', note: '....................' }) : []
    };

    // We can't easily call exportCasePDF from here if we don't expose state and other helpers.
    // So we'll have to use a simplified version of the logic or ensure helpers are global.
    
    if (window.exportCasePDF) {
        // We need to temporarily add this mock log to state.logs or modify exportCasePDF to accept it.
        // Since state.logs is global (likely), we can push it then remove it.
        if (window.state && window.state.logs) {
            window.state.logs.push(mockLog);
            try {
                await window.exportCasePDF(mockLog.id);
            } finally {
                // Remove the mock log
                window.state.logs = window.state.logs.filter(l => l.id !== mockLog.id);
            }
        }
    }
}

window.exportBlankISO = exportBlankISO;
