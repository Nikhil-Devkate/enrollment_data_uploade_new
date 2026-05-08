function updateSummary() {

    const productsEl = document.getElementById('summaryProducts');
    const fileEl = document.getElementById('summaryFile');

    if (!productsEl || !fileEl) return;

    // ---------------------------
    // Policies (Ordered List)
    // ---------------------------
    if (AppState.selectedProducts.length > 0) {

        let policyList = "<ol class='mb-0'>";

        AppState.selectedProducts.forEach(p => {
            policyList += `<li>${p.shortSummaryLabel}</li>`;
        });

        policyList += "</ol>";

        productsEl.innerHTML = policyList;

    } else {
        productsEl.innerHTML = "<span class='text-muted'>None selected</span>";
    }

    // ---------------------------
    // Files (Ordered List)
    // ---------------------------
    if (AppState.currentFiles && AppState.currentFiles.length > 0) {

        let fileList = "<ol class='mb-0'>";

        AppState.currentFiles.forEach(f => {
            fileList += `<li>${f.name}</li>`;
        });

        fileList += "</ol>";

        fileEl.innerHTML = fileList;

    } else {
        fileEl.innerHTML = "<span class='text-muted'>No file selected</span>";
    }
}

// ==============================
// 🚀 INITIATE API
// ==============================

function mapPolicyType(type) {
    switch (type) {
        case "NON INSURANCE BENEFITS":
            return "NIB";
        case "ADDITIONAL INSURANCE BENEFITS":
            return "AIB";
        default:
            return type; // keep as-is (GPA, GTL, GHI etc.)
    }
}


async function initiateUpload(file, group, policy) {

    const payload = {
        organization_id: "ABC002",

        //policy_type: policy?.typeOfPolicy || "GMC",
        // policy_type: AppState.selectedProducts.length > 0
        // ? AppState.selectedProducts.map(p => mapPolicyType(p.typeOfPolicy))
        // : ["GMC"],

        policy_type: AppState.selectedProducts.length === 1
        ? mapPolicyType(AppState.selectedProducts[0].typeOfPolicy)   // string
        : AppState.selectedProducts.length > 1
        ? AppState.selectedProducts.map(p => mapPolicyType(p.typeOfPolicy)) // array
        : "GMC",
        filename: file.name,
        file_size: file.size,
        content_type: file.type,
        tags: {},
        custom_metadata: {},
        batch_id: "",
        batch_sequence: 1,
        batch_total: 1,
        group_id: group?.groupChildSrNo || 0,
        group_code: group?.groupCode || "",
        group_name: group?.groupName || "",
        master_group_name: group?.masterGroupName || ""
    };

    console.log('INITIATE PAYLOAD : ', payload)

    const res = await fetch("https://employee.mybenefits360.in/AI_mb360_API/api/fileproxy/initiate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "accept": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
            const errorText = await res.text();
            console.log("Initiate API Error:", errorText);
            throw new Error("Initiate failed");
        }


    return await res.json();
}

async function uploadFileToStorage(uploadUrl, file, uploadFields) {

    const formData = new FormData();

    // ✅ Append all S3 fields
    Object.keys(uploadFields).forEach(key => {
        formData.append(key, uploadFields[key]);
    });

    // ✅ Append file (VERY IMPORTANT: key must be 'file')
    formData.append("file", file);

    const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData
    });

    console.log("UPLOAD STATUS:", res.status);

    if (!res.ok) {
        const text = await res.text();
        console.log("Upload Error:", text);
        throw new Error("File upload failed");
    }

    return true;
}


// ==============================
// ✅ COMPLETE API
// ==============================
async function completeUpload(fileId) {

    const res = await fetch(`https://employee.mybenefits360.in/AI_mb360_API/api/fileproxy/complete/${fileId}`, {
        method: "POST",
        headers: { "accept": "application/json" }
    });

    if (!res.ok) {
            const errorText = await res.text();
            console.log("Complete API Error:", errorText);
            throw new Error("Complete failed");
        }

         const text = await res.text();
        return text ? JSON.parse(text) : {};

    
}


// ==============================
// 📊 STATUS API
// ==============================
async function getFileStatus(fileId) {

    const res = await fetch(`https://employee.mybenefits360.in/AI_mb360_API/api/fileproxy/status/${fileId}`, {
        method: "GET"
    });

    if (!res.ok) throw new Error("Status failed");

    return await res.json();
}


// ==============================
// 🔁 POLLING (WAIT FOR COMPLETE)
// ==============================
async function waitForCompletion(fileId, retries = 10) {

    for (let i = 0; i < retries; i++) {

        const status = await getFileStatus(fileId);
        console.log("STATUS:", status);

        if (status.status === "QUEUED") return status;
        if (status.status === "COMPLETED") return status;
        if (status.status === "FAILED") throw new Error("Processing failed");

        await new Promise(r => setTimeout(r, 5000));
    }

    throw new Error("Timeout waiting for completion");
}


// ==============================
// 📂 FILE LIST API
// ==============================
async function getFilesList(organizationId, status = 1) {

    const res = await fetch(`https://employee.mybenefits360.in/AI_mb360_API/api/fileproxy/list?organization_id=${organizationId}&status=${status}`);

    if (!res.ok) throw new Error("List fetch failed");

    return await res.json();
}


// ==============================
// 📥 DOWNLOAD API
// ==============================
async function getDownloadUrl(fileId) {

    const res = await fetch(`https://employee.mybenefits360.in/AI_mb360_API/api/fileproxy/download/${fileId}`);

    if (!res.ok) throw new Error("Download API failed");

    return await res.json();
}


async function downloadFile(fileId) {

    //fileId = "file-19bc6cdea071";
    try {

        const res = await fetch(
            `https://employee.mybenefits360.in/AI_mb360_API/api/fileproxy/agent/${fileId}`
        );

        if (!res.ok) throw new Error("Agent API failed");

        const data = await res.json();

        //const agentList = Array.isArray(data) ? data : [data];

        const agentList = data.agents || [];
        const agent9 = agentList.find(a => a.agent_order === 9);
        

        if (!agent9) {
            alert("File still processing...");
            return;
        }

        if (agent9.status !== "COMPLETED") {
            alert("File still processing...");
            return;
        }        

        const details = agent9.details?.validation_details || [];

        showDownloadOptions(details);


    } catch (err) {
        console.error(err);
        alert("Download failed");
    }
}

function showDownloadOptions(details) {

    const container = document.getElementById("downloadModalBody");

    let html = `
        <div class="table-responsive">
        <table class="table table-bordered table-striped">
            <thead class="table-dark">
                <tr>
                    <th>Policy</th>
                    <th>Type</th>
                    <th>Success File</th>
                    <th>Reject File</th>
                </tr>
            </thead>
            <tbody>
    `;

    details.forEach(item => {

        // const successUrl = item.success_file?.download_url;
        // const rejectUrl = item.reject_file?.download_url;

        const successUrl = item.download_details?.success_url;
        const rejectUrl = item.download_details?.reject_url;


        html += `
            <tr>
                <td>${item.policy_name}</td>
                <td>${item.file_type}</td>

                <td>
                    ${successUrl
                        ? `<a href="${successUrl}" target="_blank"
                             class="btn btn-sm btn-success">
                             Download
                           </a>`
                        : `<span class="text-muted">N/A</span>`
                    }
                </td>

                <td>
                    ${rejectUrl
                        ? `<a href="${rejectUrl}" target="_blank"
                             class="btn btn-sm btn-danger">
                             Download
                           </a>`
                        : `<span class="text-muted">N/A</span>`
                    }
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </div>
    `;

    container.innerHTML = html;

    // ✅ Show modal
    const modal = new bootstrap.Modal(document.getElementById("downloadModal"));
    modal.show();
}


function renderFilesTable() {

    const tbody = document.getElementById("filesTableBody");
    const section = document.getElementById("filesSection");

    if (!tbody) {
        console.error("filesTableBody not found");
        return;
    }


    if (!allFiles || allFiles.length === 0) {
        section.classList.add("d-none");

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No files available
                </td>
            </tr>`;
        return;
    }

    // ✅ Show section when data exists
    section.classList.remove("d-none");

    tbody.innerHTML = "";

    const start = currentPage * pageSize;
    const end = start + pageSize;

    const pageData = allFiles.slice(start, end);

    if (allFiles.length > 0) {
        section.classList.remove("d-none");
    } else {
        section.classList.add("d-none");
    }

    if (!pageData.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No files found
                </td>
            </tr>`;
        return;
    }

    pageData.forEach((file, index) => {

        const srNo = start + index + 1;

        const row = `
            <tr>
                <td>${srNo}</td>
                <td>${file.id}</td>
                <td>${file.original_filename}</td>
                <td>
                    <span class="badge ${getStatusClass(file.status)}">
                        ${file.status}
                    </span>
                </td>
                <td>${(file.file_size_bytes / 1024).toFixed(2)}</td>
                <td>${new Date(file.created_at).toLocaleString()}</td>
                <td>
                    <span 
                        title="${file.status !== 'COMPLETED' ? 'Download available only for completed files' : ''}"
                        style="${file.status !== 'COMPLETED' ? 'cursor:not-allowed; display:inline-block;' : ''}">
                        <button onclick="${file.status === 'COMPLETED' ? `downloadFile('${file.id}')` : ''}" 
                            class="btn btn-sm btn-primary" ${file.status !== 'COMPLETED' ? 'disabled' : ''}>
                            Download File
                        </button>
                    </span>
                </td>
            </tr>
        `;

        tbody.innerHTML += row;
    });

    updatePaginationUI();
}

function updatePaginationUI() {

    const totalPages = Math.ceil(allFiles.length / pageSize);

    document.getElementById("pageInfo").innerText =
        `Page ${currentPage + 1} of ${totalPages}`;

    document.getElementById("prevBtn").disabled = currentPage === 0;
    document.getElementById("nextBtn").disabled = currentPage >= totalPages - 1;
}

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        renderFilesTable();
    }
});

document.getElementById("nextBtn").addEventListener("click", () => {
    currentPage++;
    renderFilesTable();
});

function getStatusClass(status) {
    switch (status) {
        case "COMPLETED": return "bg-success";
        case "FAILED": return "bg-danger";
        case "QUEUED": return "bg-warning text-dark";
        case "UPLOADING": return "bg-info text-dark";
        default: return "bg-secondary";
    }
}


// ==============================
// 🔄 LOAD FILE LIST
// ==============================

let allFiles = [];
let currentPage = 0;
const pageSize = 10;

async function loadFiles() {
    try {
        const data = await getFilesList("ABC002", 1);

        allFiles = data.files || [];

        currentPage = 0;

        renderFilesTable();
    } catch (err) {
        console.log(err);
    }
}

////////////////////////////////////////////////////

// ==============================
// 🎯 MAIN BUTTON (CONFIRM UPLOAD)
// ==============================
document.getElementById("confirmUploadBtn")
.addEventListener("click", async function () {

    if (!AppState.currentGroup) {
        alert("Group not loaded.");
        return;
    }

    if (!AppState.selectedProducts.length) {
        alert("Select at least one policy.");
        return;
    }

    if (!AppState.currentFiles.length) {
        alert("Select at least one file.");
        return;
    }

    try {

        for (const file of AppState.currentFiles) {

            // 1️⃣ INITIATE
            const init = await initiateUpload(
                file,
                AppState.currentGroup,
                AppState.selectedProducts[0]
            );

            const fileId = init.file_id || init.id;

            if (!fileId) throw new Error("file_id missing");

            // 2️⃣ UPLOAD (if provided)
            if (init.upload_url) {
                await uploadFileToStorage(
    init.upload_url,
    file,
    init.upload_fields
);
            }

            // 3️⃣ COMPLETE
            await completeUpload(fileId);

            // 4️⃣ WAIT FOR PROCESSING
            await waitForCompletion(fileId);
        }

        // ✅ Clear AppState
AppState.selectedProducts = [];
AppState.currentFiles = [];

// ✅ Reset UI
document.querySelectorAll('.policy-checkbox')
    .forEach(cb => cb.checked = false);

document.getElementById("selectedCount").innerText = "0 Selected";

const fileTableBody = document.getElementById("fileTableBody");
if (fileTableBody) fileTableBody.innerHTML = "";

const fileListContainer = document.getElementById("fileListContainer");
if (fileListContainer) fileListContainer.classList.add("d-none");

// ✅ Update summary
updateSummary();

// ✅ Disable steps
document.getElementById("fileAccordionBtn")?.setAttribute("disabled", true);
document.getElementById("summaryAccordionBtn")?.setAttribute("disabled", true);

// ✅ Close accordion
const summaryCollapseEl = document.getElementById("summaryCollapse");
if (summaryCollapseEl) {
    const bsCollapse = bootstrap.Collapse.getInstance(summaryCollapseEl)
        || new bootstrap.Collapse(summaryCollapseEl, { toggle: false });

    bsCollapse.hide();
}

// ✅ Refresh file list
await loadFiles();

// ✅ Toast instead of alert
const toastEl = document.getElementById("successToast");
if (toastEl) {
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}
    } catch (err) {
        console.log(err);
        alert("Error submitting request.");
    }
});