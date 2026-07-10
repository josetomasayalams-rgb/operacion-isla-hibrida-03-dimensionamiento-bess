(function () {
  "use strict";

  const controls = {
    load: document.getElementById("critical-load"),
    step: document.getElementById("maximum-step"),
    autonomy: document.getElementById("autonomy"),
    power: document.getElementById("bess-power"),
    energy: document.getElementById("bess-energy"),
    socWindow: document.getElementById("soc-window"),
    efficiency: document.getElementById("efficiency")
  };
  const valueOutputs = {
    load: document.getElementById("critical-load-value"),
    step: document.getElementById("maximum-step-value"),
    autonomy: document.getElementById("autonomy-value"),
    power: document.getElementById("bess-power-value"),
    energy: document.getElementById("bess-energy-value"),
    socWindow: document.getElementById("soc-window-value"),
    efficiency: document.getElementById("efficiency-value")
  };
  const outputs = {
    powerMargin: document.getElementById("power-margin"),
    energyMargin: document.getElementById("energy-margin"),
    autonomy: document.getElementById("calculated-autonomy"),
    status: document.getElementById("sizing-status"),
    requiredPowerLabel: document.getElementById("required-power-label"),
    requiredEnergyLabel: document.getElementById("required-energy-label"),
    pointLabel: document.getElementById("selected-sizing-label"),
    xMaxLabel: document.getElementById("x-max-label"),
    yMaxLabel: document.getElementById("y-max-label")
  };
  const visual = {
    svg: document.getElementById("sizing-svg"),
    passZone: document.getElementById("pass-zone"),
    powerLine: document.getElementById("required-power-line"),
    energyLine: document.getElementById("required-energy-line"),
    point: document.getElementById("selected-sizing-point")
  };

  function format(value, digits) {
    return value.toLocaleString("es-CL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function signed(value, digits, unit) {
    const prefix = value >= 0 ? "+" : "−";
    return `${prefix}${format(Math.abs(value), digits)} ${unit}`;
  }

  function syncLabels() {
    valueOutputs.load.value = `${format(Number(controls.load.value), 1)} MW`;
    valueOutputs.step.value = `${format(Number(controls.step.value), 1)} MW`;
    valueOutputs.autonomy.value = `${format(Number(controls.autonomy.value), 1)} h`;
    valueOutputs.power.value = `${format(Number(controls.power.value), 1)} MW`;
    valueOutputs.energy.value = `${format(Number(controls.energy.value), 0)} MWh`;
    valueOutputs.socWindow.value = `${format(Number(controls.socWindow.value), 0)} %`;
    valueOutputs.efficiency.value = `${format(Number(controls.efficiency.value), 0)} %`;
  }

  function calculate() {
    const loadMW = Number(controls.load.value);
    const stepMW = Number(controls.step.value);
    const autonomyHours = Number(controls.autonomy.value);
    const installedPowerMW = Number(controls.power.value);
    const nominalEnergyMWh = Number(controls.energy.value);
    const socWindow = Number(controls.socWindow.value) / 100;
    const efficiency = Number(controls.efficiency.value) / 100;
    const requiredPowerMW = loadMW + stepMW;
    const requiredUsefulEnergyMWh = loadMW * autonomyHours;
    const usefulEnergyMWh = nominalEnergyMWh * socWindow * efficiency;
    const requiredNominalEnergyMWh = requiredUsefulEnergyMWh / (socWindow * efficiency);
    const calculatedAutonomyHours = usefulEnergyMWh / loadMW;
    return {
      loadMW, stepMW, autonomyHours, installedPowerMW, nominalEnergyMWh, socWindow, efficiency,
      requiredPowerMW, requiredUsefulEnergyMWh, usefulEnergyMWh, requiredNominalEnergyMWh,
      calculatedAutonomyHours,
      powerMarginMW: installedPowerMW - requiredPowerMW,
      energyMarginMWh: usefulEnergyMWh - requiredUsefulEnergyMWh
    };
  }

  function render() {
    syncLabels();
    const result = calculate();
    const xMax = Math.max(20, Math.ceil(Math.max(result.installedPowerMW, result.requiredPowerMW) * 1.25 / 5) * 5);
    const yMax = Math.max(60, Math.ceil(Math.max(result.nominalEnergyMWh, result.requiredNominalEnergyMWh) * 1.25 / 20) * 20);
    const x = (value) => 78 + (value / xMax) * 742;
    const y = (value) => 400 - (value / yMax) * 365;
    const requiredX = x(result.requiredPowerMW);
    const requiredY = y(result.requiredNominalEnergyMWh);
    const pointX = x(result.installedPowerMW);
    const pointY = y(result.nominalEnergyMWh);

    outputs.powerMargin.textContent = signed(result.powerMarginMW, 1, "MW");
    outputs.energyMargin.textContent = signed(result.energyMarginMWh, 1, "MWh útiles");
    outputs.autonomy.textContent = `${format(result.calculatedAutonomyHours, 1)} h`;
    outputs.requiredPowerLabel.textContent = `Preq ${format(result.requiredPowerMW, 1)} MW`;
    outputs.requiredEnergyLabel.textContent = `Ereq nominal ${format(result.requiredNominalEnergyMWh, 1)} MWh`;
    outputs.pointLabel.textContent = `${format(result.installedPowerMW, 1)} MW · ${format(result.nominalEnergyMWh, 0)} MWh`;
    outputs.xMaxLabel.textContent = `${format(xMax, 0)} MW`;
    outputs.yMaxLabel.textContent = `${format(yMax, 0)} MWh`;

    visual.powerLine.setAttribute("x1", requiredX);
    visual.powerLine.setAttribute("x2", requiredX);
    visual.energyLine.setAttribute("y1", requiredY);
    visual.energyLine.setAttribute("y2", requiredY);
    visual.passZone.setAttribute("x", requiredX);
    visual.passZone.setAttribute("width", Math.max(0, 820 - requiredX));
    visual.passZone.setAttribute("height", Math.max(0, requiredY - 35));
    visual.point.setAttribute("cx", pointX);
    visual.point.setAttribute("cy", pointY);
    outputs.pointLabel.setAttribute("x", Math.min(700, pointX + 16));
    outputs.pointLabel.setAttribute("y", Math.max(50, pointY - 8));
    outputs.requiredPowerLabel.setAttribute("x", Math.min(710, requiredX + 10));
    outputs.requiredEnergyLabel.setAttribute("y", Math.max(48, requiredY - 10));

    const powerPass = result.powerMarginMW >= 0;
    const energyPass = result.energyMarginMWh >= 0;
    let message;
    if (powerPass && energyPass) message = "el punto supera las restricciones educativas de potencia y energía; todavía requiere estudios P/Q, degradación, contingencias y garantías";
    else if (!powerPass && !energyPass) message = "el punto no puede tomar el escalón conservador ni sostener la autonomía objetivo";
    else if (!powerPass) message = "la energía sería suficiente, pero falta potencia instantánea para la carga más el escalón";
    else message = "la potencia es suficiente, pero la energía útil no alcanza la autonomía objetivo";
    outputs.status.innerHTML = `<strong>Lectura:</strong> ${message}.`;
    visual.svg.setAttribute("aria-label", `BESS seleccionado ${format(result.installedPowerMW, 1)} megawatts y ${format(result.nominalEnergyMWh, 0)} megawatt-hora. Requiere ${format(result.requiredPowerMW, 1)} megawatts y ${format(result.requiredNominalEnergyMWh, 1)} megawatt-hora nominales.`);

    window.GFMApp.update((state) => {
      state.activeModule = "03";
      state.scenario.load.activePowerMW = result.loadMW;
      state.scenario.load.maximumStepMW = result.stepMW;
      state.scenario.load.requiredAutonomyHours = result.autonomyHours;
      state.scenario.bess.powerMW = result.installedPowerMW;
      state.scenario.bess.energyMWh = result.nominalEnergyMWh;
      state.scenario.bess.energyHours = result.nominalEnergyMWh / result.installedPowerMW;
      state.scenario.bess.minimumSocPct = (100 - Number(controls.socWindow.value)) / 2;
      state.scenario.bess.maximumSocPct = 100 - state.scenario.bess.minimumSocPct;
      state.scenario.bess.efficiencyPct = Number(controls.efficiency.value);
      return state;
    });
  }

  Object.values(controls).forEach((control) => control.addEventListener("input", syncLabels));
  document.getElementById("evaluate-sizing").addEventListener("click", render);
  const state = window.GFMApp.getState();
  controls.load.value = state.scenario.load.activePowerMW;
  controls.step.value = state.scenario.load.maximumStepMW;
  controls.autonomy.value = state.scenario.load.requiredAutonomyHours;
  controls.power.value = state.scenario.bess.powerMW;
  controls.energy.value = state.scenario.bess.energyMWh;
  controls.socWindow.value = state.scenario.bess.maximumSocPct - state.scenario.bess.minimumSocPct;
  controls.efficiency.value = state.scenario.bess.efficiencyPct;
  window.GFMApp.markComplete("03");
  render();
})();
