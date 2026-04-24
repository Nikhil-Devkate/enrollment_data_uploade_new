
document.addEventListener("DOMContentLoaded", function () {

    waitForGroupAndLoadGrid();

    // ✅ ADD THIS BLOCK HERE
    const pageSizeSelect = document.getElementById("pageSizeSelect");

    if (pageSizeSelect) {

        pageSizeSelect.addEventListener("change", function () {

            pageSize = parseInt(this.value);
            currentPage = 1;

            loadGrid();
        });
    }
});

function waitForGroupAndLoadGrid() {

    const interval = setInterval(() => {

        if (AppState.currentGroup) {

            clearInterval(interval);

            loadGrid();

        }

    }, 200);
}

async function loadGrid(page = 1) {

    // currentPage = page;

    // const loader = document.getElementById("gridLoader");
    // const table = document.getElementById("historyTable");

    // try {

    //     // Show loader
    //     loader.classList.remove("d-none");
    //     table.innerHTML = "";

    //     const groupChildSrNo = AppState.currentGroup.groupChildSrNo;

    //     const response = await fetch(
    //         `https://employee.mybenefits360.in/AI_mb360_API/api/uploadrequests/grid?groupChildSrNo=${groupChildSrNo}&pageNumber=${page}&pageSize=${pageSize}`
    //     );

    //     if (!response.ok) {
    //         throw new Error("Failed to load grid");
    //     }

    //     const result = await response.json();

    //     renderGrid(result);

    // } catch (error) {

    //     console.log("Grid Load Error:", error);

    // } finally {

    //     // Hide loader
    //     loader.classList.add("d-none");

    // }

    loadFiles();
}

function renderGrid(result) {

    const tbody = document.getElementById("historyTable");

    tbody.innerHTML = "";

    if (!result.data || result.data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No requests found
                </td>
            </tr>
        `;

        return;
    }

    result.data.forEach((item, index) => {

        const serialNo =
            ((currentPage - 1) * pageSize) + index + 1;

        const policiesHtml = `
            <ol class="mb-0">
                ${item.policies.map(p => `<li>${p}</li>`).join("")}
            </ol>
        `;

        const fileIcon = `
        <button class="btn btn-sm btn-outline-primary"
        onclick='showFilesModal(${JSON.stringify(item.files)})'>
        <i class="bi bi-paperclip"></i>
        </button>
        `;

        const row = `
            <tr>
                <td>${serialNo}</td>
                <td>${policiesHtml}</td>
                <td class="text-center">${fileIcon}</td>
                <td>${formatDate(item.createdOn)}</td>
                <td>${formatDate(item.lastModifiedOn)}</td>
                <td>${renderStatusBadge(item.status)}</td>
            </tr>
        `;

        tbody.insertAdjacentHTML("beforeend", row);

    });

    renderPagination(result.totalRecords);
}

function renderStatusBadge(status) {

    switch (status?.toLowerCase()) {

        case "pending":
            return `<span class="badge bg-warning text-dark">Pending</span>`;

        case "processing":
            return `<span class="badge bg-info">Processing</span>`;

        case "completed":
            return `<span class="badge bg-success">Completed</span>`;

        case "failed":
            return `<span class="badge bg-danger">Failed</span>`;

        default:
            return `<span class="badge bg-secondary">${status}</span>`;
    }
}

function formatDate(dateStr) {

    if (!dateStr) return "-";

    return new Date(dateStr).toLocaleString();
}

function renderPagination(totalRecords) {

    const container = document.getElementById("paginationContainer");
    container.innerHTML = "";

    const totalPages = Math.ceil(totalRecords / pageSize);

    if (totalPages <= 1) return;

    // Previous button
    container.insertAdjacentHTML("beforeend", `
        <button class="btn btn-sm btn-outline-secondary me-1"
            ${currentPage === 1 ? "disabled" : ""}
            onclick="loadGrid(${currentPage - 1})">
            Prev
        </button>
    `);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {

        container.insertAdjacentHTML("beforeend", `
            <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'} me-1"
                onclick="loadGrid(${i})">
                ${i}
            </button>
        `);
    }

    // Next button
    container.insertAdjacentHTML("beforeend", `
        <button class="btn btn-sm btn-outline-secondary"
            ${currentPage === totalPages ? "disabled" : ""}
            onclick="loadGrid(${currentPage + 1})">
            Next
        </button>
    `);
}

function showFilesModal(files) {

    const modalBody = document.getElementById("filesModalBody");

    if (!files || files.length === 0) {
        modalBody.innerHTML =
            "<p class='text-muted'>No files found.</p>";
    } else {

        const list = `
            <ol>
                ${files.map(f => `<li>${f}</li>`).join("")}
            </ol>
        `;

        modalBody.innerHTML = list;
    }

    const modal = new bootstrap.Modal(
        document.getElementById("filesModal")
    );

    modal.show();
}
