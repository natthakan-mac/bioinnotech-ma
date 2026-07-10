const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const searchRegex = /<div id="case-type-dashboard"[\s\S]*?<!-- Pie Chart -->\s*<div class="case-type-chart-container"[\s\S]*?<\/canvas>\s*<\/div>\s*<\/div>\s*<\/div>/;

const replaceStr = `<div class="dashboard-chart-wrapper" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 1.5rem; margin-top: 0.5rem; margin-bottom: 1.5rem; width: 100%;">
                    
                    <!-- Pie Chart -->
                    <div class="case-type-chart-container" style="flex: 0 0 280px; background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                        <h3 style="font-size: 0.9rem; margin: 0 0 1rem 0; color: var(--text-color); font-weight: 600; text-align: center;">à¸ªà¸±à¸”à¸ªà¹ˆà¸§à¸™à¸›à¸£à¸°à¹€à¸ à¸—à¸‡à¸²à¸™</h3>
                        <div style="position: relative; width: 100%; max-width: 200px; aspect-ratio: 1/1;">
                            <canvas id="case-type-pie-chart"></canvas>
                        </div>
                    </div>

                    <div id="case-type-dashboard" class="case-dashboard-container" style="flex: 1; min-width: 320px;">
                        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; width: 100%;">
                            <!-- Card 2: à¸šà¸³à¸£à¸¸à¸‡à¸£à¸±à¸à¸©à¸²à¸•à¸²à¸¡à¸£à¸­à¸š -->
                            <div class="dashboard-card interactive-card" data-category="à¸šà¸³à¸£à¸¸à¸‡à¸£à¸±à¸à¸©à¸²à¸•à¸²à¸¡à¸£à¸­à¸š" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s; cursor: pointer;">
                                <div class="dashboard-card-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                    <i class="fa-solid fa-calendar-check"></i>
                                </div>
                                <div class="dashboard-card-content" style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">à¸šà¸³à¸£à¸¸à¸‡à¸£à¸±à¸à¸©à¸²à¸•à¸²à¸¡à¸£à¸­à¸š</span>
                                    <span id="dash-case-pm" style="font-size: 1.5rem; font-weight: 700; color: var(--text-color); line-height: 1.2; margin-top: 2px;">0</span>
                                </div>
                            </div>

                            <!-- Card 3: à¸•à¸´à¸”à¸•à¸±à¹‰à¸‡ -->
                            <div class="dashboard-card interactive-card" data-category="à¸•à¸´à¸”à¸•à¸±à¹‰à¸‡" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s; cursor: pointer;">
                                <div class="dashboard-card-icon" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                    <i class="fa-solid fa-toolbox"></i>
                                </div>
                                <div class="dashboard-card-content" style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">à¸•à¸´à¸”à¸•à¸±à¹‰à¸‡</span>
                                    <span id="dash-case-install" style="font-size: 1.5rem; font-weight: 700; color: var(--text-color); line-height: 1.2; margin-top: 2px;">0</span>
                                </div>
                            </div>

                            <!-- Card 4: à¸‹à¹ˆà¸­à¸¡ -->
                            <div class="dashboard-card interactive-card" data-category="à¸‹à¹ˆà¸­à¸¡" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s; cursor: pointer;">
                                <div class="dashboard-card-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                    <i class="fa-solid fa-screwdriver-wrench"></i>
                                </div>
                                <div class="dashboard-card-content" style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">à¸‹à¹ˆà¸­à¸¡</span>
                                    <span id="dash-case-repair" style="font-size: 1.5rem; font-weight: 700; color: var(--text-color); line-height: 1.2; margin-top: 2px;">0</span>
                                </div>
                            </div>

                            <!-- Card 5: à¸£à¸·à¹‰à¸­à¸–à¸­à¸™ -->
                            <div class="dashboard-card interactive-card" data-category="à¸£à¸·à¹‰à¸­à¸–à¸­à¸™" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s; cursor: pointer;">
                                <div class="dashboard-card-icon" style="background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                    <i class="fa-solid fa-circle-minus"></i>
                                </div>
                                <div class="dashboard-card-content" style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">à¸£à¸·à¹‰à¸­à¸–à¸­à¸™</span>
                                    <span id="dash-case-deinstall" style="font-size: 1.5rem; font-weight: 700; color: var(--text-color); line-height: 1.2; margin-top: 2px;">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

// Since the whole structure starts from <div class="dashboard-chart-wrapper"
// We can match that instead to be safe.
const fullReplaceRegex = /<div class="dashboard-chart-wrapper"[\s\S]*?<\/canvas>\s*<\/div>\s*<\/div>\s*<\/div>/;

if (fullReplaceRegex.test(content)) {
    content = content.replace(fullReplaceRegex, replaceStr);
    fs.writeFileSync('index.html', content);
    console.log('Successfully replaced index.html');
} else {
    console.log('Search string not found in index.html');
}
