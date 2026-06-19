document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 0. Tactile Sound Synthesizer (Web Audio API)
    // -------------------------------------------------------------------------
    let audioCtx = null;
    
    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playTactileClack(pitch = 1.0, duration = 0.05, type = 'triangle') {
        try {
            initAudioContext();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = type;
            const freq = (180 + Math.random() * 60) * pitch;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    }

    document.addEventListener('click', () => {
        initAudioContext();
    }, { once: true });

    // -------------------------------------------------------------------------
    // 1. Navigation Active Link Tracker (Scroll Highlights)
    // -------------------------------------------------------------------------
    const navLinks = document.querySelectorAll('.nav-link');
    const navSections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        let currentActiveId = 'about';
        let minDistance = Infinity;

        navSections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const distance = Math.abs(rect.top - 120);
            if (rect.top <= 180 && distance < minDistance) {
                minDistance = distance;
                currentActiveId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${currentActiveId}`) {
                link.classList.add('active');
            }
        });
    });

    // -------------------------------------------------------------------------
    // 2. Intersection Observer for Skills Bar Filling Animation
    // -------------------------------------------------------------------------
    const skillsSection = document.getElementById('skills');
    const skillFills = document.querySelectorAll('.fill-progress');

    const skillsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                playTactileClack(0.6, 0.08, 'triangle');
                skillFills.forEach(fill => {
                    const targetWidth = fill.style.width;
                    fill.style.width = '0';
                    setTimeout(() => {
                        fill.style.width = targetWidth;
                    }, 100);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    if (skillsSection) {
        skillsObserver.observe(skillsSection);
    }

    // -------------------------------------------------------------------------
    // 3. Modal Overlay Open/Close Interactions
    // -------------------------------------------------------------------------
    const projectCards = document.querySelectorAll('.project-card');
    const modals = document.querySelectorAll('.modal-overlay');

    projectCards.forEach(card => {
        card.addEventListener('click', () => {
            const projectType = card.getAttribute('data-project');
            const targetModal = document.getElementById(`modal-${projectType}`);
            if (targetModal) {
                playTactileClack(1.5, 0.1, 'sine');
                targetModal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Lock background scrolling
                
                // Trigger visualizer redraws to ensure correct dimensions
                if (projectType === 'ecommerce') {
                    renderEcommerceChart('all');
                } else if (projectType === 'churn') {
                    renderChurnHeatmap('month');
                } else if (projectType === 'abtest') {
                    calculateSignificance();
                }
            }
        });
    });

    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close-btn');
        
        // Close on button click
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeModal(modal);
            });
        }
        
        // Close on backdrop overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    function closeModal(modal) {
        playTactileClack(1.0, 0.05, 'triangle');
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Unlock scrolling
        
        // Stop stream simulation if it's the fraud modal
        if (modal.id === 'modal-fraud' && streamInterval) {
            clearInterval(streamInterval);
            streamInterval = null;
            const btn = document.getElementById('btn-trigger-fraud');
            if (btn) {
                btn.textContent = 'SIMULATE STREAM';
                btn.classList.remove('active');
            }
        }
    }

    // -------------------------------------------------------------------------
    // 4. Micro-Dashboard 1: E-Commerce Sales Vector Chart
    // -------------------------------------------------------------------------
    const svgChart = document.getElementById('chart-ecommerce');
    const filterButtons = document.querySelectorAll('#modal-ecommerce [data-filter]');
    const kpiMarginVal = document.getElementById('kpi-margin');

    const chartData = {
        all: [
            { label: 'Phones', val: 120, type: 'tech' },
            { label: 'Laptops', val: 140, type: 'tech' },
            { label: 'Rugs', val: 50, type: 'decor' },
            { label: 'Lighting', val: 75, type: 'decor' },
            { label: 'Tables', val: 90, type: 'decor' }
        ],
        tech: [
            { label: 'Phones', val: 120, type: 'tech' },
            { label: 'Laptops', val: 140, type: 'tech' },
            { label: 'Monitors', val: 85, type: 'tech' },
            { label: 'Chargers', val: 40, type: 'tech' }
        ],
        decor: [
            { label: 'Rugs', val: 50, type: 'decor' },
            { label: 'Lighting', val: 75, type: 'decor' },
            { label: 'Tables', val: 90, type: 'decor' },
            { label: 'Mirrors', val: 65, type: 'decor' }
        ]
    };

    const margins = {
        all: '31.4%',
        tech: '42.1%',
        decor: '18.5%'
    };

    function renderEcommerceChart(filterType) {
        if (!svgChart) return;
        svgChart.innerHTML = ''; 
        
        const chartHeight = 115;
        const chartWidth = 360;
        const paddingLeft = 50;
        const paddingBottom = 20;
        const barWidth = 35;
        const gap = 15;
        const maxVal = 160;

        // Y grid lines
        for (let i = 0; i <= 3; i++) {
            const yVal = chartHeight - (i * 30) - paddingBottom;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', paddingLeft);
            line.setAttribute('y1', yVal);
            line.setAttribute('x2', chartWidth);
            line.setAttribute('y2', yVal);
            line.setAttribute('stroke', 'var(--border-color)');
            line.setAttribute('stroke-dasharray', '2,2');
            svgChart.appendChild(line);

            const gridLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            gridLabel.setAttribute('x', paddingLeft - 8);
            gridLabel.setAttribute('y', yVal + 3);
            gridLabel.setAttribute('text-anchor', 'end');
            gridLabel.textContent = `$${i * 50}K`;
            gridLabel.setAttribute('fill', 'var(--text-secondary)');
            gridLabel.setAttribute('font-size', '7.5px');
            svgChart.appendChild(gridLabel);
        }

        const data = chartData[filterType];
        data.forEach((item, index) => {
            const x = paddingLeft + gap + (index * (barWidth + gap));
            const normHeight = (item.val / maxVal) * (chartHeight - paddingBottom - 10);
            const y = chartHeight - paddingBottom - normHeight;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', chartHeight - paddingBottom); 
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', 0);
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', item.type === 'tech' ? 'var(--accent-teal)' : 'var(--accent-orange)');
            rect.setAttribute('stroke', 'var(--border-color)');
            rect.setAttribute('stroke-width', '1');
            rect.style.cursor = 'pointer';
            
            rect.addEventListener('mouseenter', () => {
                rect.setAttribute('fill', 'var(--text-primary)');
                playTactileClack(1.2 + item.val * 0.005, 0.03, 'sine');
            });
            rect.addEventListener('mouseleave', () => {
                rect.setAttribute('fill', item.type === 'tech' ? 'var(--accent-teal)' : 'var(--accent-orange)');
            });

            svgChart.appendChild(rect);

            // Animate
            setTimeout(() => {
                rect.setAttribute('y', y);
                rect.setAttribute('height', normHeight);
            }, 50);

            // Text Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + barWidth / 2);
            text.setAttribute('y', chartHeight - 5);
            text.setAttribute('text-anchor', 'middle');
            text.textContent = item.label;
            text.setAttribute('fill', 'var(--text-secondary)');
            text.setAttribute('font-size', '8px');
            text.setAttribute('font-weight', '500');
            svgChart.appendChild(text);
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            playTactileClack(1.0, 0.04, 'triangle');
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            renderEcommerceChart(filter);
            kpiMarginVal.textContent = margins[filter];
        });
    });

    // -------------------------------------------------------------------------
    // 5. Micro-Dashboard 2: Customer Churn Heatmap
    // -------------------------------------------------------------------------
    const heatmapContainer = document.getElementById('heatmap-churn');
    const churnControls = document.querySelectorAll('#modal-churn [data-contract]');
    const kpiChurnVal = document.getElementById('kpi-churn');

    const churnGridData = {
        month: [
            { segment: 'TechSupport=No', val: '49%' },
            { segment: 'Contract=M2M', val: '43%' },
            { segment: 'FiberOptic', val: '41%' },
            { segment: 'Paperless', val: '33%' },
            { segment: 'OnlineBackup=No', val: '31%' },
            { segment: 'NoDependents', val: '28%' },
            { segment: 'SeniorCitizen', val: '25%' },
            { segment: 'ElectronicCheck', val: '22%' }
        ],
        year: [
            { segment: 'TechSupport=Yes', val: '12%' },
            { segment: 'Contract=1Yr', val: '11%' },
            { segment: 'DSLConnection', val: '14%' },
            { segment: 'PaperBilling=No', val: '9%' },
            { segment: 'Backup=Yes', val: '15%' },
            { segment: 'Dependents=Yes', val: '10%' },
            { segment: 'NonSenior', val: '8%' },
            { segment: 'CreditCardPay', val: '13%' }
        ]
    };

    const churnAverages = {
        month: '33.9%',
        year: '11.5%'
    };

    function renderChurnHeatmap(contractType) {
        if (!heatmapContainer) return;
        heatmapContainer.innerHTML = ''; 
        const data = churnGridData[contractType];

        data.forEach(item => {
            const cell = document.createElement('div');
            cell.classList.add('heatmap-cell');
            
            const pct = parseInt(item.val);
            let alpha = pct / 65; 
            
            // Soft coral shades matching the color registry
            cell.style.backgroundColor = `rgba(225, 29, 72, ${Math.min(alpha * 0.9, 0.85)})`;

            cell.innerHTML = `
                <span class="cell-val">${item.val}</span>
                <span class="cell-label">${item.segment.split('=')[0]}</span>
            `;

            cell.title = `Segment: ${item.segment} \nChurn rate: ${item.val}`;
            cell.addEventListener('mouseenter', () => {
                playTactileClack(1.0 + pct * 0.015, 0.035, 'sine');
                cell.style.backgroundColor = 'var(--text-primary)';
                cell.querySelector('.cell-val').style.color = 'var(--bg-card)';
            });
            cell.addEventListener('mouseleave', () => {
                cell.style.backgroundColor = `rgba(225, 29, 72, ${Math.min(alpha * 0.9, 0.85)})`;
                cell.querySelector('.cell-val').style.color = 'var(--text-primary)';
            });
            heatmapContainer.appendChild(cell);
        });
    }

    churnControls.forEach(btn => {
        btn.addEventListener('click', () => {
            playTactileClack(1.0, 0.04, 'triangle');
            churnControls.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const contract = btn.getAttribute('data-contract');
            renderChurnHeatmap(contract);
            kpiChurnVal.textContent = churnAverages[contract];
        });
    });

    // -------------------------------------------------------------------------
    // 6. Micro-Dashboard 3: Banking Ledger Fraud Stream
    // -------------------------------------------------------------------------
    const ledgerBody = document.getElementById('ledger-body');
    const btnTriggerFraud = document.getElementById('btn-trigger-fraud');
    let streamInterval = null;

    function generateLedgerRow() {
        if (!ledgerBody) return;
        const time = new Date().toLocaleTimeString();
        const amt = (Math.random() * 1200 + 5).toFixed(2);
        const isSuspicious = Math.random() > 0.8;
        const risk = isSuspicious ? (Math.random() * 0.2 + 0.8) : (Math.random() * 0.3);
        const status = isSuspicious ? 'FLAGGED' : 'SAFE';

        const row = document.createElement('div');
        row.classList.add('ledger-row');
        
        row.innerHTML = `
            <span>${time}</span>
            <span>$${amt}</span>
            <span>${risk.toFixed(2)}</span>
            <span class="${isSuspicious ? 'status-flagged' : 'status-safe'}">${status}</span>
        `;

        ledgerBody.insertBefore(row, ledgerBody.firstChild);

        // Warning alerts
        if (isSuspicious) {
            playTactileClack(0.4, 0.15, 'sawtooth');
            row.style.backgroundColor = 'rgba(225, 29, 72, 0.05)';
        } else {
            playTactileClack(0.9, 0.02, 'sine');
        }

        if (ledgerBody.children.length > 4) {
            ledgerBody.removeChild(ledgerBody.lastChild);
        }
    }

    // Pre-populate some entries
    for(let i=0; i<3; i++) {
        setTimeout(generateLedgerRow, i * 150);
    }

    if (btnTriggerFraud) {
        btnTriggerFraud.addEventListener('click', () => {
            playTactileClack(0.8, 0.05, 'triangle');
            if (streamInterval) {
                clearInterval(streamInterval);
                streamInterval = null;
                btnTriggerFraud.textContent = 'SIMULATE STREAM';
                btnTriggerFraud.classList.remove('active');
            } else {
                btnTriggerFraud.textContent = 'STOP STREAM';
                btnTriggerFraud.classList.add('active');
                streamInterval = setInterval(generateLedgerRow, 1000);
            }
        });
    }

    // -------------------------------------------------------------------------
    // 7. Micro-Dashboard 4: A/B Significance curves
    // -------------------------------------------------------------------------
    const sliderControl = document.getElementById('slider-control');
    const sliderVariant = document.getElementById('slider-variant');
    const valControlConv = document.getElementById('val-control-conv');
    const valVariantConv = document.getElementById('val-variant-conv');
    const abCalcResult = document.getElementById('ab-calc-result');
    const svgAbChart = document.getElementById('chart-abtest');

    function drawDistributionCurves(meanC, sdC, meanV, sdV) {
        if (!svgAbChart) return;
        svgAbChart.innerHTML = '';
        const width = 400;
        const height = 70;
        const padding = 15;

        const scaleX = (x) => padding + ((x / 0.35) * (width - 2 * padding));
        const scaleY = (y, maxDensity) => height - 5 - (y / maxDensity) * (height - 15);

        const pointsC = [];
        const pointsV = [];
        const step = 0.001;

        const normalPDF = (x, mean, sd) => {
            return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
        };

        let maxDensity = 0;
        for (let x = 0; x <= 0.35; x += step) {
            const densityC = normalPDF(x, meanC, sdC);
            const densityV = normalPDF(x, meanV, sdV);
            
            pointsC.push({ x, y: densityC });
            pointsV.push({ x, y: densityV });
            
            if (densityC > maxDensity) maxDensity = densityC;
            if (densityV > maxDensity) maxDensity = densityV;
        }

        const drawGridX = (convVal, labelText) => {
            const sx = scaleX(convVal);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', sx);
            line.setAttribute('y1', 5);
            line.setAttribute('x2', sx);
            line.setAttribute('y2', height - 5);
            line.setAttribute('stroke', 'var(--border-color)');
            line.setAttribute('stroke-dasharray', '1,2');
            svgAbChart.appendChild(line);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', sx);
            text.setAttribute('y', height);
            text.setAttribute('font-family', 'var(--font-mono)');
            text.setAttribute('font-size', '6.5px');
            text.setAttribute('fill', 'var(--text-secondary)');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = labelText;
            svgAbChart.appendChild(text);
        };

        drawGridX(0.05, '5%');
        drawGridX(0.15, '15%');
        drawGridX(0.25, '25%');
        drawGridX(0.35, '35%');

        const buildPathString = (points) => {
            let pathD = `M ${scaleX(points[0].x)} ${height - 5}`;
            points.forEach(pt => {
                pathD += ` L ${scaleX(pt.x)} ${scaleY(pt.y, maxDensity)}`;
            });
            pathD += ` L ${scaleX(points[points.length - 1].x)} ${height - 5} Z`;
            return pathD;
        };

        // Draw Control Curve (Teal Fill)
        const pathControl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathControl.setAttribute('d', buildPathString(pointsC));
        pathControl.setAttribute('fill', 'rgba(13, 148, 136, 0.25)');
        pathControl.setAttribute('stroke', 'var(--border-color)');
        pathControl.setAttribute('stroke-width', '1.5');
        svgAbChart.appendChild(pathControl);

        // Draw Variant Curve (Orange/Coral Fill)
        const pathVariant = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathVariant.setAttribute('d', buildPathString(pointsV));
        pathVariant.setAttribute('fill', 'rgba(234, 88, 12, 0.25)');
        pathVariant.setAttribute('stroke', 'var(--border-color)');
        pathVariant.setAttribute('stroke-width', '1.5');
        svgAbChart.appendChild(pathVariant);
    }

    function calculateSignificance() {
        if (!sliderControl || !sliderVariant) return;
        const cRate = parseFloat(sliderControl.value) / 100;
        const vRate = parseFloat(sliderVariant.value) / 100;

        valControlConv.textContent = `${sliderControl.value}.0%`;
        valVariantConv.textContent = `${sliderVariant.value}.0%`;

        const n1 = 1000;
        const n2 = 1000;

        const pPooled = (cRate * n1 + vRate * n2) / (n1 + n2);
        const se = Math.sqrt(pPooled * (1 - pPooled) * ((1 / n1) + (1 / n2)));

        const sdC = Math.sqrt(cRate * (1 - cRate) / n1);
        const sdV = Math.sqrt(vRate * (1 - vRate) / n2);

        drawDistributionCurves(cRate, sdC, vRate, sdV);

        if (se === 0) {
            abCalcResult.textContent = 'SIG_DIAG: DELTA_0';
            abCalcResult.className = 'calc-result invalid';
            return;
        }

        const zScore = Math.abs((vRate - cRate) / se);
        const isSignificant = zScore > 1.96;
        
        if (isSignificant) {
            abCalcResult.textContent = `STATISTICAL_SIGNIFICANCE: TRUE (Z: ${zScore.toFixed(2)}, p < 0.05)`;
            abCalcResult.className = 'calc-result valid';
        } else {
            abCalcResult.textContent = `STATISTICAL_SIGNIFICANCE: FALSE (Z: ${zScore.toFixed(2)}, p >= 0.05)`;
            abCalcResult.className = 'calc-result invalid';
        }
    }

    if (sliderControl && sliderVariant) {
        sliderControl.addEventListener('input', () => {
            playTactileClack(0.7 + parseFloat(sliderControl.value) * 0.04, 0.02, 'sine');
            calculateSignificance();
        });
        sliderVariant.addEventListener('input', () => {
            playTactileClack(0.7 + parseFloat(sliderVariant.value) * 0.04, 0.02, 'sine');
            calculateSignificance();
        });
    }
});
