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



/////////////////////////////////////////////////////

// ==============================
// 🚀 INITIATE API
// ==============================
async function initiateUpload(file, group, policy) {

    const payload = {
        organization_id: "thynkSight",
        policy_type: policy?.typeOfPolicy || "GMC",
        filename: file.name,
        file_size: file.size,
        content_type: file.type,
        tags: {},
        custom_metadata: {},
        batch_id: "batch_001",
        batch_sequence: 1,
        batch_total: 1,
        group_id: group?.groupChildSrNo || 0,
        group_code: group?.groupCode || "",
        group_name: group?.groupName || "",
        master_group_name: group?.masterGroupName || ""
    };

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


// ==============================
// 📤 UPLOAD FILE (S3 / Blob)
// ==============================
// async function uploadFileToStorage(uploadUrl, file) {

//     // const res = await fetch(uploadUrl, {
//     //     method: "PUT",
//     //     body: file
//     // });

//     // if (!res.ok) throw new Error("File upload failed");

//     // return true;

//     const res = await fetch(uploadUrl, {
//         method: "PUT",
//         headers: {
//             "Content-Type": file.type || "application/octet-stream"
//         },
//         body: file
//     });

//     if (!res.ok) {
//         const text = await res.text();
//         console.log("Upload Error:", text);
//         throw new Error("File upload failed");
//     }

//     return true;
// }

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

        await new Promise(r => setTimeout(r, 2000));
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

    const res = await getDownloadUrl(fileId);

    if (!res.download_url) {
        throw new Error("Download URL missing");
    }

    window.open(res.download_url, "_blank");
}


// ==============================
// 🧩 RENDER FILE TABLE
// ==============================
// function renderFilesTable(data) {

//     const tbody = document.getElementById("filesTableBody");
//     tbody.innerHTML = "";

//     data?.items?.forEach(file => {

//         const row = `
//             <tr>
//                 <td>${file.file_id}</td>
//                 <td>${file.filename}</td>
//                 <td>${file.status}</td>
//                 <td>
//                     <button onclick="downloadFile(${file.file_id})" 
//                             class="btn btn-sm btn-primary">
//                         Download
//                     </button>
//                 </td>
//             </tr>
//         `;

//         tbody.innerHTML += row;
//     });
// }

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
                    <button onclick="downloadFile('${file.id}')" 
                            class="btn btn-sm btn-primary">
                        Download
                    </button>
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
        const data = await getFilesList("thynkSight", 1);

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

// document.getElementById("confirmUploadBtn")
//     .addEventListener("click", async function () {

//         if (!AppState.currentGroup) {
//             alert("Group not loaded.");
//             return;
//         }

//         if (!AppState.selectedProducts.length) {
//             alert("Please select at least one policy.");
//             return;
//         }

//         if (!AppState.currentFiles.length) {
//             alert("Please select at least one file.");
//             return;
//         }

//         try {
//             const formData = new FormData();

//             // Basic fields
//             formData.append("GroupChildSrNo", AppState.currentGroup.groupChildSrNo);
//             formData.append("RequestBy", 1); // replace with logged-in user later

//             // JSON fields
//             formData.append(
//                 "OrgPolicyJson",
//                 JSON.stringify(AppState.currentGroup)
//             );

//             formData.append(
//                 "SelPolicyJson",
//                 JSON.stringify(AppState.selectedProducts)
//             );

//             // Multiple files
//             AppState.currentFiles.forEach(file => {
//                 formData.append("Files", file);
//             });

//             const response = await fetch(
//                 "https://employee.mybenefits360.in/AI_mb360_API/api/uploadrequests",
//                 {
//                     method: "POST",
//                     body: formData
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error("Upload failed");
//             }

//             const result = await response.json();

//             // 1️⃣ Clear AppState
//             AppState.selectedProducts = [];
//             AppState.currentFiles = [];

//             // 2️⃣ Clear Step 1 checkboxes
//             document.querySelectorAll('.policy-checkbox')
//             .forEach(cb => cb.checked = false);

//             document.getElementById("selectedCount").innerText = "0 Selected";

//             // 3️⃣ Clear Step 2 file table
//             const fileTableBody = document.getElementById("fileTableBody");
//             if (fileTableBody) fileTableBody.innerHTML = "";

//             const fileListContainer = document.getElementById("fileListContainer");
//             if (fileListContainer) fileListContainer.classList.add("d-none");

//             // 4️⃣ Clear Step 3 summary
//             updateSummary();

//             // 5️⃣ Disable Step 2 & Step 3
//             document.getElementById("fileAccordionBtn")?.setAttribute("disabled", true);
//             document.getElementById("summaryAccordionBtn")?.setAttribute("disabled", true);

//             // 7️⃣ Close Step 3 accordion
//             const summaryCollapseEl = document.getElementById("summaryCollapse");

//             if (summaryCollapseEl) {
//             const bsCollapse = bootstrap.Collapse.getInstance(summaryCollapseEl)
//             || new bootstrap.Collapse(summaryCollapseEl, { toggle: false });

//             bsCollapse.hide();
//             }

//             // Show Bootstrap Toast
//             const toastEl = document.getElementById("successToast");

//             if (toastEl) {
//             const toast = new bootstrap.Toast(toastEl, {
//             delay: 3000
//             });

//             toast.show();
//             }

//         } catch (error) {
//             console.log(error);
//             alert("Error submitting request.");
//         }
//     });