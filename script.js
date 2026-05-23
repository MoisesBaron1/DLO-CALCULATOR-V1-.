/**
 * @fileoverview DLO Calculator - Enterprise Grade Application
 * Handles both Forward (Frame -> DLO) and Inverse (DLO -> Frame) calculations.
 * Encapsulated in an IIFE to prevent global namespace pollution.
 */

(function () {
  'use strict';

  // ============================================================
  // SYSTEM CONFIGURATION & DATA MANAGEMENT
  // ============================================================
  
  const DEFAULT_SYSTEMS = {
    LG225: {
      name: "LG225",
      strategy: "perPiece",
      frames: { single: 3.125, perPiece: 1.5625 },
      lites:  { single: 3.125, perPiece: 1.5625 }
    },
    ES8000: {
      name: "ES-8000/T",
      strategy: "edgeCenter",
      frames: { single: 5.5, jambEdge: 2.75, center: 3.75 },
      lites:  { single: 5.5, jambEdge: 2.75, center: 3.75 }
    },
    CW: {
      name: "CW (1032-7525-7000)",
      strategy: "edgeCenter",
      frames: { single: 5, jambEdge: 3.75, center: 2.5 },
      lites:  { single: 5, jambEdge: 3.75, center: 2.5 }
    }
  };

  class SystemManager {
    constructor() {
      this.systems = this.loadSystems();
    }
    
    loadSystems() {
      const stored = localStorage.getItem('DLO_SYSTEMS');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error('Failed to parse systems', e); }
      }
      this.saveSystems(DEFAULT_SYSTEMS);
      return DEFAULT_SYSTEMS;
    }

    saveSystems(systems) {
      this.systems = systems;
      localStorage.setItem('DLO_SYSTEMS', JSON.stringify(this.systems));
    }

    saveSystem(id, config) {
      this.systems[id] = config;
      this.saveSystems(this.systems);
    }

    deleteSystem(id) {
      delete this.systems[id];
      this.saveSystems(this.systems);
    }
  }

  const systemManager = new SystemManager();

  /**
   * Enum for calculation directions to avoid magic strings.
   * @readonly
   * @enum {string}
   */
  const CalcDirection = {
    FORWARD: 'forward', // Frame -> DLO
    INVERSE: 'inverse'  // DLO -> Frame
  };

  // ============================================================
  // DLO CALCULATOR CLASS
  // ============================================================
  class DLOCalculator {
    constructor() {
      // Application State
      this.state = {
        system: null,
        mode: null,
        direction: CalcDirection.FORWARD,
        lastResults: [],
        totalMeasurement: 0,
        qty: 0
      };

      // DOM Elements Cache
      this.dom = {
        inputWidth:    document.getElementById('input-width'),
        inputHeight:   document.getElementById('input-height'),
        inputQuantity: document.getElementById('input-quantity'),
        
        resultsBox:     document.getElementById('results-box'),
        resultsEmpty:   document.getElementById('results-empty'),
        resultsContent: document.getElementById('results-content'),
        summaryDim:     document.getElementById('summary-dim'),
        summaryQty:     document.getElementById('summary-qty'),
        summaryDimLabel:document.getElementById('summary-dim-label'),
        summaryQtyContainer: document.getElementById('summary-qty-container'),
        btnCopy:        document.getElementById('btn-copy'),
        toast:          document.getElementById('toast'),
        
        // Buttons
        btnFrames: document.getElementById('btn-frames'),
        btnLites:  document.getElementById('btn-lites'),

        // Toggle elements
        toggleInput:   document.getElementById('calc-direction-toggle'),
        labelForward:  document.getElementById('label-forward'),
        labelInverse:  document.getElementById('label-inverse'),
        
        // Dynamic labels
        labelWidth:     document.getElementById('label-width'),
        labelHeight:    document.getElementById('label-height'),
        dimLabel:       document.getElementById('dimensions-label'),
        resultsLabel:   document.getElementById('results-label'),

        sysBtnContainer: document.querySelector('.section .btn-group')
      };

      this.initEvents();
      this.renderSystemButtons();
    }

    /**
     * Initializes all event listeners for the application.
     */
    initEvents() {
      const { dom } = this;

      // Mode Buttons
      const modeBtns = [dom.btnFrames, dom.btnLites];
      dom.btnFrames.onclick = () => this.setMode('frames', dom.btnFrames, modeBtns);
      dom.btnLites.onclick  = () => this.setMode('lites', dom.btnLites, modeBtns);

      // Inputs
      dom.inputWidth.addEventListener('input', () => this.calculate());
      dom.inputHeight.addEventListener('input', () => this.calculate());
      dom.inputQuantity.addEventListener('input', () => this.calculate());

      // Toggle Direction
      dom.toggleInput.addEventListener('change', (e) => this.toggleDirection(e.target.checked));

      // Copy
      dom.btnCopy.addEventListener('click', () => this.copyToClipboard());
    }

    renderSystemButtons() {
      this.dom.sysBtnContainer.innerHTML = ''; // clear old buttons
      const systems = systemManager.systems;
      let activeFound = false;

      Object.keys(systems).forEach(sysId => {
        const config = systems[sysId];
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerHTML = config.name;
        
        if (this.state.system === sysId) {
          btn.classList.add('active');
          activeFound = true;
        }

        btn.onclick = () => {
          Array.from(this.dom.sysBtnContainer.children).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.system = sysId;
          this.calculate();
        };

        this.dom.sysBtnContainer.appendChild(btn);
      });

      if (!activeFound && Object.keys(systems).length > 0) {
        this.state.system = null;
      }
      this.calculate();
    }

    /**
     * Sets the active mode (frames/lites).
     */
    setMode(modeId, activeBtn, group) {
      group.forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
      this.state.mode = modeId;
      this.calculate();
    }

    /**
     * Toggles between Forward and Inverse calculation modes.
     * @param {boolean} isInverse 
     */
    toggleDirection(isInverse) {
      this.state.direction = isInverse ? CalcDirection.INVERSE : CalcDirection.FORWARD;
      
      const { dom } = this;
      
      // Update UI labels
      if (isInverse) {
        dom.labelForward.classList.remove('active');
        dom.labelInverse.classList.add('active');
        dom.labelWidth.textContent = 'DLO Width';
        dom.labelHeight.textContent = 'DLO Height';
        dom.dimLabel.textContent = '3. DLO Dimensions (Inches)';
        dom.resultsLabel.textContent = 'Results (Total Frame)';
      } else {
        dom.labelInverse.classList.remove('active');
        dom.labelForward.classList.add('active');
        dom.labelWidth.textContent = 'Width';
        dom.labelHeight.textContent = 'Height';
        dom.dimLabel.textContent = '3. Frame Dimensions (Inches)';
        dom.resultsLabel.textContent = 'Results (DLO)';
      }

      this.calculate();
    }

    /**
     * Main Controller: Parses inputs and dispatches to appropriate calculation strategy.
     */
    calculate() {
      const width    = parseFloat(this.dom.inputWidth.value);
      const height   = parseFloat(this.dom.inputHeight.value);
      const quantity = parseInt(this.dom.inputQuantity.value);

      if (!this.state.system || !this.state.mode || isNaN(quantity) || quantity <= 0) {
        this.showEmpty(); 
        return;
      }

      // Determine relevant measurement based on mode
      const measurement = (this.state.mode === 'frames') ? width : height;
      if (isNaN(measurement) || measurement <= 0) { 
        this.showEmpty(); 
        return; 
      }

      const config = systemManager.systems[this.state.system];
      if (!config) {
        this.showEmpty();
        return;
      }
      const deductions = config[this.state.mode];
      const strategy = config.strategy || 'edgeCenter';

      // Strategy execution
      if (this.state.direction === CalcDirection.FORWARD) {
        this.executeForwardMath(measurement, quantity, deductions, strategy);
      } else {
        this.executeInverseMath(measurement, quantity, deductions, strategy);
      }
    }

    /**
     * Strategy: Calculate DLO from Frame (Forward)
     */
    executeForwardMath(measurement, quantity, deductions, strategy) {
      let results = [];

      if (quantity === 1) {
        results.push(measurement - deductions.single);
      } 
      else if (strategy === 'perPiece') {
        const base = (measurement - deductions.perPiece) / quantity;
        for (let i = 0; i < quantity; i++) {
          results.push(base - deductions.perPiece);
        }
      } 
      else if (strategy === 'edgeCenter') {
        let base = (measurement / quantity);
        for (let i = 0; i < quantity; i++) {
          const isJambEdge = (i === 0 || i === quantity - 1);
          results.push(isJambEdge ? (base - deductions.jambEdge) : (base - deductions.center));
        }
      }
      else if (strategy === 'edgeCenterSingle') {
        // Fallback for custom logic if added
        let base = ((measurement - deductions.single) / quantity);
        for (let i = 0; i < quantity; i++) {
          const isJambEdge = (i === 0 || i === quantity - 1);
          results.push(isJambEdge ? (base - deductions.jambEdge) : (base - deductions.center));
        }
      }

      // Prevent negatives
      results = results.map(r => Math.max(0, r));
      
      this.state.lastResults = results;
      this.state.totalMeasurement = measurement;
      this.state.qty = quantity;

      this.renderResultsForward();
    }

    /**
     * Strategy: Calculate Total Frame from DLO (Inverse)
     */
    executeInverseMath(inputDLO, quantity, deductions, strategy) {
      let totalFrame = 0;

      if (quantity === 1) {
        totalFrame = inputDLO + deductions.single;
      } 
      else if (strategy === 'perPiece') {
        totalFrame = (quantity * inputDLO) + ((quantity + 1) * deductions.perPiece);
      } 
      else if (strategy === 'edgeCenter') {
        totalFrame = (quantity * inputDLO) + (2 * deductions.jambEdge) + ((quantity - 2) * deductions.center);
      } 
      else if (strategy === 'edgeCenterSingle') {
        totalFrame = (quantity * inputDLO) + deductions.single + (2 * deductions.jambEdge) + ((quantity - 2) * deductions.center);
      }

      this.state.lastResults = [totalFrame];
      this.state.totalMeasurement = inputDLO; // the DLO requested
      this.state.qty = quantity;

      this.renderResultsInverse(totalFrame);
    }

    /**
     * Returns the name of the structural part for the given DLO index.
     */
    getPartName(i, qty, mode) {
      if (qty <= 1) return '';
      if (mode === 'frames') {
        if (i === 0 || i === qty - 1) return 'Jamb';
        return 'Mullion';
      } else {
        if (i === 0) return 'Head';
        if (i === qty - 1) return 'Sill';
        return 'Horizontal';
      }
    }

    /**
     * Hides results and shows awaiting prompt
     */
    showEmpty() {
      this.dom.resultsContent.classList.remove('visible');
      this.dom.resultsEmpty.classList.add('visible');
      this.dom.btnCopy.disabled = true;
      this.state.lastResults = [];
    }

    /**
     * Renders Forward Mode results (list of DLOs)
     */
    renderResultsForward() {
      this.dom.resultsEmpty.classList.remove('visible');
      this.dom.resultsContent.classList.add('visible');
      this.dom.btnCopy.disabled = false;
      this.dom.resultsBox.innerHTML = '';

      this.dom.summaryDimLabel.textContent = 'Total Dim:';
      this.dom.summaryDim.textContent = this.decimalToFraction(this.state.totalMeasurement);
      this.dom.summaryQtyContainer.style.display = 'flex';
      this.dom.summaryQty.textContent = this.state.qty;

      const label = (this.state.mode === 'frames') ? 'Frame' : 'Lite';
      const list = this.state.lastResults;

      list.forEach((value, i) => {
        const isEdge = list.length > 1 && (i === 0 || i === list.length - 1);
        const row = document.createElement('div');
        row.className = 'result-row' + (isEdge ? ' edge' : '');
        row.style.animationDelay = `${i * 0.05}s`;

        const partName = this.getPartName(i, list.length, this.state.mode);
        const partSuffix = partName ? ` &middot; ${partName}` : '';

        row.innerHTML = `
          <span class="row-label">${label} DLO ${i + 1}${partSuffix}</span>
          <span class="row-value">${this.decimalToFraction(value)}</span>
        `;
        this.dom.resultsBox.appendChild(row);
      });
    }

    /**
     * Renders Inverse Mode results (single Total Frame)
     */
    renderResultsInverse(totalFrame) {
      this.dom.resultsEmpty.classList.remove('visible');
      this.dom.resultsContent.classList.add('visible');
      this.dom.btnCopy.disabled = false;
      this.dom.resultsBox.innerHTML = '';

      this.dom.summaryDimLabel.textContent = 'Target DLO:';
      this.dom.summaryDim.textContent = this.decimalToFraction(this.state.totalMeasurement);
      this.dom.summaryQtyContainer.style.display = 'flex';
      this.dom.summaryQty.textContent = this.state.qty;

      const row = document.createElement('div');
      row.className = 'result-row edge';
      row.innerHTML = `
        <span class="row-label">Required Total Frame Size</span>
        <span class="row-value">${this.decimalToFraction(totalFrame)}</span>
      `;
      this.dom.resultsBox.appendChild(row);
    }

    /**
     * Copies structured results to user's clipboard
     */
    copyToClipboard() {
      if (this.state.lastResults.length === 0) return;
      
      const config = systemManager.systems[this.state.system];
      if (!config) return;

      let textToCopy = `${config.name} - ${this.state.mode.toUpperCase()}\n`;
      textToCopy += `Mode: ${this.state.direction === CalcDirection.FORWARD ? 'Frame to DLO' : 'DLO to Frame'}\n`;
      
      if (this.state.direction === CalcDirection.FORWARD) {
        textToCopy += `Total Dim: ${this.decimalToFraction(this.state.totalMeasurement)} | Qty: ${this.state.qty}\n`;
        textToCopy += `--------------------------\n`;
        this.state.lastResults.forEach((val, i) => {
          const partName = this.getPartName(i, this.state.qty, this.state.mode);
          const partSuffix = partName ? ` (${partName})` : '';
          textToCopy += `DLO ${i + 1}${partSuffix}: \t${this.decimalToFraction(val)}\n`;
        });
      } else {
        textToCopy += `Target DLO (per lite): ${this.decimalToFraction(this.state.totalMeasurement)} | Qty: ${this.state.qty}\n`;
        textToCopy += `--------------------------\n`;
        textToCopy += `Required Total Frame Size: \t${this.decimalToFraction(this.state.lastResults[0])}\n`;
      }

      navigator.clipboard.writeText(textToCopy).then(() => {
        this.dom.toast.classList.add('show');
        setTimeout(() => { this.dom.toast.classList.remove('show'); }, 2500);
      });
    }

    /**
     * Utility: Converts decimal to closest /16 inch fraction
     */
    decimalToFraction(n) {
      if (n <= 0) return '0"';
      const whole = Math.trunc(n);
      const frac  = Math.abs(n - whole);
      const denom = 16;
      const numer = Math.round(frac * denom);

      if (numer === 0)     return `${whole}"`;
      if (numer === denom) return `${whole + 1}"`;

      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const d   = gcd(numer, denom);
      const fn  = numer / d;
      const fd  = denom / d;

      return whole === 0 ? `${fn}/${fd}"` : `${whole} ${fn}/${fd}"`;
    }
  }

  // ============================================================
  // ADMIN PANEL LOGIC
  // ============================================================
  class AdminPanel {
    constructor(calculatorInstance) {
      this.calculator = calculatorInstance;
      this.editingSystemId = null;

      // DOM Elements
      this.dom = {
        btnLoginOpen: document.getElementById('btn-admin-login'),
        loginModal: document.getElementById('admin-login-modal'),
        passwordInput: document.getElementById('admin-password'),
        btnSubmitLogin: document.getElementById('btn-submit-login'),
        btnCancelLogin: document.getElementById('btn-cancel-login'),

        dashboardModal: document.getElementById('admin-dashboard-modal'),
        btnCloseAdmin: document.getElementById('btn-close-admin'),
        systemList: document.getElementById('admin-system-list'),
        btnAddSystem: document.getElementById('btn-add-system'),
        
        systemForm: document.getElementById('admin-system-form'),
        emptyState: document.getElementById('admin-empty-state'),
        formTitle: document.getElementById('form-title'),
        
        // Form Fields
        inputId: document.getElementById('sys-id'),
        inputName: document.getElementById('sys-name'),
        inputStrategy: document.getElementById('sys-strategy'),

        // Frames
        frameSingle: document.getElementById('sys-frame-single'),
        frameEdge: document.getElementById('sys-frame-edge'),
        frameCenter: document.getElementById('sys-frame-center'),
        framePerPiece: document.getElementById('sys-frame-perpiece'),
        
        // Lites
        liteSingle: document.getElementById('sys-lite-single'),
        liteEdge: document.getElementById('sys-lite-edge'),
        liteCenter: document.getElementById('sys-lite-center'),
        litePerPiece: document.getElementById('sys-lite-perpiece'),
        
        // Buttons
        btnSaveSystem: document.getElementById('btn-save-system'),
        btnCancelSystem: document.getElementById('btn-cancel-system'),
        btnDeleteSystem: document.getElementById('btn-delete-system')
      };

      if(this.dom.btnLoginOpen) {
          this.initEvents();
      }
    }

    initEvents() {
      const { dom } = this;

      // Login Modal
      dom.btnLoginOpen.addEventListener('click', () => {
        dom.passwordInput.value = '';
        dom.loginModal.classList.remove('hidden');
        setTimeout(() => dom.passwordInput.focus(), 50);
      });

      dom.btnCancelLogin.addEventListener('click', () => {
        dom.loginModal.classList.add('hidden');
      });

      dom.btnSubmitLogin.addEventListener('click', () => this.handleLogin());
      dom.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
      });

      // Dashboard
      dom.btnCloseAdmin.addEventListener('click', () => {
        dom.dashboardModal.classList.add('hidden');
      });

      dom.btnAddSystem.addEventListener('click', () => this.showForm(null));
      
      dom.inputStrategy.addEventListener('change', (e) => this.updateFormVisibility(e.target.value));

      dom.btnCancelSystem.addEventListener('click', () => {
        dom.systemForm.classList.add('hidden');
        dom.emptyState.classList.remove('hidden');
        this.editingSystemId = null;
        this.renderSystemList(); // clear active selection
      });

      dom.btnDeleteSystem.addEventListener('click', () => this.deleteSystem());
      dom.systemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSystem();
      });
    }

    handleLogin() {
      const pwd = this.dom.passwordInput.value;
      if (pwd === 'MoisesBaron1') {
        this.dom.loginModal.classList.add('hidden');
        this.openDashboard();
      } else {
        alert('Incorrect Password');
      }
    }

    openDashboard() {
      this.dom.dashboardModal.classList.remove('hidden');
      this.dom.systemForm.classList.add('hidden');
      this.dom.emptyState.classList.remove('hidden');
      this.editingSystemId = null;
      this.renderSystemList();
    }

    renderSystemList() {
      const systems = systemManager.systems;
      this.dom.systemList.innerHTML = '';
      
      Object.keys(systems).forEach(id => {
        const item = document.createElement('div');
        item.className = 'system-list-item' + (this.editingSystemId === id ? ' active' : '');
        item.textContent = systems[id].name;
        item.onclick = () => this.showForm(id);
        this.dom.systemList.appendChild(item);
      });
    }

    updateFormVisibility(strategy) {
      const edgeCenterFields = document.querySelectorAll('.math-edge-center');
      const perPieceFields = document.querySelectorAll('.math-per-piece');
      
      if (strategy === 'edgeCenter' || strategy === 'edgeCenterSingle') {
        edgeCenterFields.forEach(el => el.classList.remove('hidden'));
        perPieceFields.forEach(el => el.classList.add('hidden'));
      } else {
        edgeCenterFields.forEach(el => el.classList.add('hidden'));
        perPieceFields.forEach(el => el.classList.remove('hidden'));
      }
    }

    showForm(id) {
      this.editingSystemId = id;
      this.dom.emptyState.classList.add('hidden');
      this.dom.systemForm.classList.remove('hidden');
      this.renderSystemList(); // update active state on sidebar

      if (id) {
        // Edit mode
        this.dom.formTitle.textContent = 'Edit System';
        this.dom.inputId.value = id;
        this.dom.inputId.disabled = true; // don't change ID of existing
        this.dom.btnDeleteSystem.style.display = 'inline-block';
        
        const config = systemManager.systems[id];
        this.dom.inputName.value = config.name;
        this.dom.inputStrategy.value = config.strategy || 'edgeCenter';
        
        // Fill frames
        this.dom.frameSingle.value = config.frames.single || 0;
        this.dom.frameEdge.value = config.frames.jambEdge || 0;
        this.dom.frameCenter.value = config.frames.center || 0;
        this.dom.framePerPiece.value = config.frames.perPiece || 0;
        
        // Fill lites
        this.dom.liteSingle.value = config.lites.single || 0;
        this.dom.liteEdge.value = config.lites.jambEdge || 0;
        this.dom.liteCenter.value = config.lites.center || 0;
        this.dom.litePerPiece.value = config.lites.perPiece || 0;

        this.updateFormVisibility(config.strategy || 'edgeCenter');

      } else {
        // Add mode
        this.dom.formTitle.textContent = 'Add New System';
        this.dom.inputId.value = '';
        this.dom.inputId.disabled = false;
        this.dom.btnDeleteSystem.style.display = 'none';
        
        this.dom.systemForm.reset();
        this.dom.inputStrategy.value = 'edgeCenter';
        this.updateFormVisibility('edgeCenter');
      }
    }

    saveSystem() {
      const id = this.dom.inputId.value.trim();
      if (!id) return;

      const strategy = this.dom.inputStrategy.value;
      const config = {
        name: this.dom.inputName.value,
        strategy: strategy,
        frames: {
          single: parseFloat(this.dom.frameSingle.value) || 0,
        },
        lites: {
          single: parseFloat(this.dom.liteSingle.value) || 0,
        }
      };

      if (strategy === 'edgeCenter' || strategy === 'edgeCenterSingle') {
        config.frames.jambEdge = parseFloat(this.dom.frameEdge.value) || 0;
        config.frames.center = parseFloat(this.dom.frameCenter.value) || 0;
        config.lites.jambEdge = parseFloat(this.dom.liteEdge.value) || 0;
        config.lites.center = parseFloat(this.dom.liteCenter.value) || 0;
      } else {
        config.frames.perPiece = parseFloat(this.dom.framePerPiece.value) || 0;
        config.lites.perPiece = parseFloat(this.dom.litePerPiece.value) || 0;
      }

      systemManager.saveSystem(id, config);
      this.calculator.renderSystemButtons(); // update main UI

      this.dom.systemForm.classList.add('hidden');
      this.dom.emptyState.classList.remove('hidden');
      this.editingSystemId = null;
      this.renderSystemList();
    }

    deleteSystem() {
      if (!this.editingSystemId) return;
      if (confirm('Are you sure you want to delete this system?')) {
        systemManager.deleteSystem(this.editingSystemId);
        this.calculator.renderSystemButtons();
        
        this.dom.systemForm.classList.add('hidden');
        this.dom.emptyState.classList.remove('hidden');
        this.editingSystemId = null;
        this.renderSystemList();
      }
    }
  }

  // Initialize App on DOM Load
  document.addEventListener('DOMContentLoaded', () => {
    window.dloApp = new DLOCalculator();
    window.adminPanel = new AdminPanel(window.dloApp);
  });

})();