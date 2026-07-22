

// --- State Management ---
let state = {
    isInitialLoading: true,
    sites: [],
    logs: [],
    addressData: [], // Raw JSON data
    currentDeleteId: null, // Track site to delete
    currentDeleteLogId: null, // Track log to delete

    // Pagination State
    isLoadingLogs: false,
    lastLogSnapshot: null,
    hasMoreLogs: false,

    // Calendar Specific State
    calendarLogs: [],
    isCalendarLoading: false,
    currentCalendarMonth: null, // "YYYY-MM"
    globalLogSummary: null, // Cache for accurate totals
};


let calendarState = {
    view: "list", // 'list' or 'calendar'
    currentDate: new Date(),
    selectedDate: null,
};

export { state, calendarState };
