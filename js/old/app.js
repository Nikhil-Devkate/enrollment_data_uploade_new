let selectedProducts = [];
let currentFile = null;
let uploadCounter = 1000;

// Product selection
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('selected');
        const value = card.dataset.value;

        if (selectedProducts.includes(value)) {
            selectedProducts = selectedProducts.filter(p => p !== value);
        } else {
            selectedProducts.push(value);
        }

        updateSummary();
    });
});

// File selection
document.getElementById('uploadBox').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function () {
    const file = this.files[0];

    if (file) {
        currentFile = file;

        document.getElementById('fileDetails').classList.remove('d-none');
        document.getElementById('fileName').innerText =
            file.name + " (" + (file.size / 1024 / 1024).toFixed(2) + " MB)";

        updateSummary();
    }
});

// Update summary
function updateSummary() {
    document.getElementById('summaryProducts').innerText =
        selectedProducts.length ? selectedProducts.join(', ') : 'None selected';

    document.getElementById('summaryFile').innerText =
        currentFile ? currentFile.name : 'No file selected';
}

// // Confirm upload
// document.getElementById('confirmUploadBtn').addEventListener('click', () => {

//     if (!selectedProducts.length || !currentFile) {
//         alert("Please select policy and file before confirming.");
//         return;
//     }

//     uploadCounter++;

//     const today = new Date().toLocaleDateString();

//     const row = `
//         <tr>
//             <td>${uploadCounter}</td>
//             <td>${selectedProducts.join(', ')}</td>
//             <td>${currentFile.name}</td>
//             <td>${today}</td>
//             <td><span class="badge bg-warning text-dark">Processing</span></td>
//         </tr>
//     `;

//     document.getElementById('historyTable').insertAdjacentHTML('afterbegin', row);

//     alert("Upload request added successfully!");
// });