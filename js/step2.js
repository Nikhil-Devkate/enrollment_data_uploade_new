document.addEventListener("DOMContentLoaded", function () {

    const uploadBox = document.getElementById("uploadBox");
    const fileInput = document.getElementById("fileInput");
    const fileError = document.getElementById("fileError");

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file

    const allowedExtensions = ["xls", "xlsx"];
    const allowedMimeTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (!uploadBox || !fileInput) return;

    AppState.currentFiles = [];

    uploadBox.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", function () {
        handleFiles(this.files);
        fileInput.value = ""; // reset input
    });

    function handleFiles(files) {

        for (let file of files) {

            const extension = file.name.split(".").pop().toLowerCase();

            if (!allowedExtensions.includes(extension)) {
                showError(`Invalid file type: ${file.name}`);
                continue;
            }

            if (!allowedMimeTypes.includes(file.type)) {
                showError(`Invalid MIME type: ${file.name}`);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                showError(`File too large: ${file.name}`);
                continue;
            }

            // Prevent duplicate file names
            if (AppState.currentFiles.some(f => f.name === file.name)) {
                continue;
            }

            AppState.currentFiles.push(file);
        }

        renderFileTable();
        updateStep3State();

        renderFileTable();
        updateStep3State();

        if (typeof updateSummary === "function") {
        updateSummary();
        }
    }

    function renderFileTable() {

        const container = document.getElementById("fileListContainer");
        const tbody = document.getElementById("fileTableBody");

        tbody.innerHTML = "";

        if (AppState.currentFiles.length === 0) {
            container.classList.add("d-none");
            return;
        }

        container.classList.remove("d-none");

        let totalSize = 0;

        AppState.currentFiles.forEach((file, index) => {

            totalSize += file.size;

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${file.name}</td>
                <td>${(file.size / 1024 / 1024).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" data-index="${index}">
                        Remove
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        document.getElementById("totalSize").innerText =
            (totalSize / 1024 / 1024).toFixed(2);

        // Remove handlers
        document.querySelectorAll("[data-index]").forEach(btn => {
            btn.addEventListener("click", function () {
                const index = parseInt(this.dataset.index);
                AppState.currentFiles.splice(index, 1);
                renderFileTable();
                updateStep3State();

                if (typeof updateSummary === "function") {
                updateSummary();
                }
            });
        });
    }

    function showError(message) {
        fileError.innerText = message;
        fileError.classList.remove("d-none");

        setTimeout(() => {
            fileError.classList.add("d-none");
        }, 3000);
    }

    function updateStep3State() {

        const summaryBtn = document.getElementById("summaryAccordionBtn");

        if (
            AppState.selectedProducts.length > 0 &&
            AppState.currentFiles.length > 0
        ) {
            summaryBtn.removeAttribute("disabled");
        } else {
            summaryBtn.setAttribute("disabled", true);
        }
    }

});