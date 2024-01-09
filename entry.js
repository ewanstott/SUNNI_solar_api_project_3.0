import {
  initMap,
  getCurrentLocation,
  searchAddress,
  resetMap,
} from "./googleMapsUtils.js";
import { getSolarLocation } from "./solarLocation.js";
import {
  calculateEnergyConsumption,
  calculateEnergySaved,
  calculateTotalSavings,
} from "./costCalulations.js";
import { displayStatsInDom } from "./utils.js";

//DOM Refs
const geoIconButton = document.getElementById("geo-icon-button");
const rootRef = document.getElementById("root");
// const solarImageRef = document.getElementById("solarImage");
// const searchRef = document.getElementById("search");
const spinner = `<div class="lds-hourglass"></div>`;
const showLocationButton = document.getElementById("showLocationButton");
const showLocationButton2 = document.getElementById("showLocationButton2");
const monthlyBillDropDown = document.getElementById("monthlyBill");

//Event listeners
geoIconButton.addEventListener("click", async () => {
  try {
    await getCurrentLocation(); // pulls users location on map using current location from googleMapsUtils.js
    await getSolarLocation(); //pull solar data for users current position
  } catch (error) {
    console.error("Error:", error);
  }
});

//showLocationButton to call getSolarData with updated lat / lon
showLocationButton.addEventListener("click", async () => {
  try {
    await searchAddress(); // Update the map location based on the searched address
    // await getSolarLocation();
  } catch (error) {
    console.error("Error:", error);
  }
});
showLocationButton2.addEventListener("click", async () => {
  try {
    await searchAddress(); // Update the map location based on the searched address
    // await getSolarLocation();
  } catch (error) {
    console.error("Error:", error);
  }
});

resetButton.addEventListener("click", () => {
  document.getElementById("addressInput").value = "";
  resetMap();
});

let selectedMonthlyBill = 100; //default value
monthlyBillDropDown.addEventListener("change", (e) => {
  // Get the selected value from the dropdown
  selectedMonthlyBill = e.target.value;
  // Check if selectedMonthlyBill is defined
  if (selectedMonthlyBill === undefined) {
    console.error("Selected monthly bill is not defined.");
    return;
  }
});

export async function updateGetSolarFunctionsLatAndLon(position) {
  try {
    const place = position[0];
    const lat = position[0].geometry.location.lat();
    const lon = position[0].geometry.location.lng();

    //call getSolarData with lat/lon
    getSolarData(lat, lon, selectedMonthlyBill, place);

    //call searchAddress to update map
    // searchAddress();
  } catch (error) {
    console.error("Error getting location:", error);
  }
}

export async function getSolarData(lat, lon, selectedMonthlyBill, place) {
  //spinner
  rootRef.innerHTML = spinner;
  let latitude, longitude;
  let costOfElectricity = 0.28;
  try {
    if (!lat || !lon) {
      const data = await getSolarLocation();
      latitude = data.coords.latitude;
      longitude = data.coords.longitude;
    } else {
      latitude = lat;
      longitude = lon;
    }

    const result = await axios.get(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&key=AIzaSyBBffGwsbP78ar-9dHLg11HFFpTJk-9Ux8`
    );

    // ENERGY CONSUMPTION CALCULATIONS
    const {
      monthlyKWhEnergyConsumption,
      annualKWhEnergyConsumption,
      annualCost,
    } = calculateEnergyConsumption(selectedMonthlyBill, costOfElectricity);
    // ENERGY SAVINGS CALCULATIONS
    const { yearlyEnergyDcKwh, annualSavings } = calculateEnergySaved(
      result.data.solarPotential.maxArrayPanelsCount,
      costOfElectricity
    );

    // TOTAL SAVINGS CALCULATION
    const totalSavings = calculateTotalSavings(annualCost, annualSavings);

    //store strings in array:
    //card1
    const calculationsComplete = `<div class="card1"> <strong>✅ Calculations Complete. Your roof data for: ${place.formatted_address} </strong></div>`;
    const maxSunshine = `<div class="card1"> 🌞 Hours of usable sunlight per year: <strong> ${Math.floor(
      result.data.solarPotential.maxSunshineHoursPerYear
    )}</strong></div>`;
    const maxArea = `<div class="card1"> ⚡ Maximum area of solar panels your roof can support:<strong> ${Math.floor(
      result.data.solarPotential.wholeRoofStats.areaMeters2
    )} m2 </strong></div>`;
    const totalSavingsOver20Years = `<div class="card1"> 🤑 If you install solar panels on your roof, your estimated Total Savings over 20 Years: <strong> £${Math.abs(
      totalSavings * 20
    )}</strong></div><br>`;
    //card2
    const carsEquivalent = `<div class="card2"><strong>Environmental Impact of Installing Solar Panels on your Roof:</strong></div>
    <div class="card2">🚗 Estimated cars taken off the road (for 1 yr): <strong>${Math.floor(
      result.data.solarPotential.carbonOffsetFactorKgPerMwh / 4.6
    )}</strong></div>`;
    const treesEquivalent = `<div class="card2">🌲 Estimated tree seedlings grown (for 10 years):<strong> ${Math.floor(
      result.data.solarPotential.carbonOffsetFactorKgPerMwh / 0.0602
    )}</strong></div>`;

    //Array to store strings
    const stringArray = [
      calculationsComplete,
      maxSunshine,
      maxArea,
      totalSavingsOver20Years,
      carsEquivalent,
      treesEquivalent,
    ];

    //clear spinner
    rootRef.innerHTML = "";

    displayStatsInDom(stringArray, rootRef);
  } catch (err) {
    rootRef.innerHTML = `Uh-oh! It seems like there is no solar data available for this location yet!`;
  }
}
initMap();
