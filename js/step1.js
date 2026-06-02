document.addEventListener("DOMContentLoaded", function () {

    // Simulating API call for now
    fetchPolicies();

});

async function fetchPolicies() {

    try {
        const groupChildSrNo = 4249; // 3200,3236,3665 // later we can make dynamic

        const response = await fetch(
            `https://employee.mybenefits360.in/AI_mb360_API/api/groups/${groupChildSrNo}`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch policies");
        }
        

        const data = await response.json();

        console.log("policy response : ",data)

        if (!data.groups || data.groups.length === 0) {
            console.log("No group data found");
            return;
        }

        // Save group info globally if needed later
        AppState.currentGroup = data.groups[0];

        // Render policies from group
        renderPolicies(data.groups[0].policies);

    } catch (error) {
        console.log("Error loading policies:", error);
    }
}

function renderPolicies(policies) {

    const container = document.getElementById("policyContainer");
    container.innerHTML = "";

    // Group by typeOfPolicy
    const grouped = {};

    policies.forEach(policy => {
        if (!grouped[policy.typeOfPolicy]) {
            grouped[policy.typeOfPolicy] = [];
        }
        grouped[policy.typeOfPolicy].push(policy);
    });

    Object.keys(grouped).forEach(groupName => {

        // Group Header
        const header = document.createElement("div");
        header.className = "col-12 policy-group-title";
        header.innerText = groupName;
        container.appendChild(header);

        // Policies under group
        grouped[groupName].forEach(policy => {

            const col = document.createElement("div");
            col.className = "col-md-4 col-lg-3";

            col.innerHTML = `
                <label class="policy-card-wrapper">
                    <input type="checkbox" 
                           class="policy-checkbox"
                           data-policy='${JSON.stringify(policy)}'>

                    <div class="policy-card">
                        <div class="check-icon">
                            <i class="bi bi-check-circle-fill"></i>
                        </div>
                        <div class="policy-title">
                            ${policy.shortSummaryLabel}
                        </div>
                        <div class="policy-sub">
                            ${policy.policyNumber || ""}
                        </div>
                    </div>
                </label>
            `;

            container.appendChild(col);
        });
    });

    loadFiles();

    attachSelectionLogic();
}

function attachSelectionLogic() {

    const checkboxes = document.querySelectorAll('.policy-checkbox');

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {

            AppState.selectedProducts = [];

            checkboxes.forEach(c => {
                if (c.checked) {
                    const policyData = JSON.parse(c.dataset.policy);
                    AppState.selectedProducts.push(policyData);
                }
            });

             // CATEGORY CHECKS
            const hasInsurance = AppState.selectedProducts.some(p =>
                ["GHI", "GPA", "GTL", "GMC"].includes(p.typeOfPolicy)
            );

            const selectedAIBCount = AppState.selectedProducts.filter(p =>
                p.typeOfPolicy === "ADDITIONAL INSURANCE BENEFITS"
            ).length;

            const selectedNIBCount = AppState.selectedProducts.filter(p =>
                p.typeOfPolicy === "NON INSURANCE BENEFITS"
            ).length;

            const hasBenefits = selectedAIBCount > 0 || selectedNIBCount > 0;

            // ENABLE / DISABLE
            checkboxes.forEach(c => {

                const policyData = JSON.parse(c.dataset.policy);

                const isInsurance =
                    ["GHI", "GPA", "GTL", "GMC"]
                        .includes(policyData.typeOfPolicy);

                const isAIB =
                    policyData.typeOfPolicy === "ADDITIONAL INSURANCE BENEFITS";

                const isNIB =
                    policyData.typeOfPolicy === "NON INSURANCE BENEFITS";

                // INSURANCE SELECTED  DISABLE BENEFITS
                if (hasInsurance && (isAIB || isNIB) && !c.checked) {

                    c.disabled = true;

                    c.closest(".policy-card-wrapper")
                        .classList.add("disabled-policy");
                }

                // BENEFITS SELECTED  DISABLE INSURANCE
                else if (hasBenefits && isInsurance && !c.checked) {

                    c.disabled = true;

                    c.closest(".policy-card-wrapper")
                        .classList.add("disabled-policy");
                }

                // ONLY ONE AIB ALLOWED
                else if (
                    selectedAIBCount >= 1 &&
                    isAIB &&
                    !c.checked
                ) {

                    c.disabled = true;

                    c.closest(".policy-card-wrapper")
                        .classList.add("disabled-policy");
                }

                // ONLY ONE NIB ALLOWED
                else if (
                    selectedNIBCount >= 1 &&
                    isNIB &&
                    !c.checked
                ) {

                    c.disabled = true;

                    c.closest(".policy-card-wrapper")
                        .classList.add("disabled-policy");
                }

                else {

                    c.disabled = false;

                    c.closest(".policy-card-wrapper")
                        .classList.remove("disabled-policy");
                }
            });

            const count = AppState.selectedProducts.length;

            document.getElementById("selectedCount").innerText =
            count + " Selected";

            const fileBtn = document.getElementById("fileAccordionBtn");
            const summaryBtn = document.getElementById("summaryAccordionBtn");

            // Step 2 depends only on policies
            if (count > 0) {
            fileBtn.removeAttribute("disabled");
            } else {
            fileBtn.setAttribute("disabled", true);
            }

            // Step 3 depends on BOTH policy + file
            if (count > 0 && AppState.currentFile) {
            summaryBtn.removeAttribute("disabled");
            } else {
            summaryBtn.setAttribute("disabled", true);
            }

            if (typeof updateSummary === "function") {
                updateSummary();
            }
        });
    });
}


