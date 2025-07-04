// Client-side JavaScript for both admin.html and index.html

// Configuration
const API_BASE_URL = 'http://localhost:5000/api'; // Update with your Render URL when deployed
const RECORDS_PER_PAGE = 5;
let currentPage = 1;
let totalPages = 1;

// DOM Elements
const recordTable = document.getElementById('recordTable') || document.getElementById('userRecordTable');
const totalAmountElement = document.getElementById('totalAmount');
const pageInfoElement = document.getElementById('pageInfo');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        // Admin-specific initialization
        const incomeForm = document.getElementById('incomeForm');
        if (incomeForm) {
            incomeForm.addEventListener('submit', handleFormSubmit);
        }
    }
    
    fetchRecords();
    setCurrentDate();
});

// Set current date in date input (for admin form)
function setCurrentDate() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

// Fetch records from API
async function fetchRecords() {
    try {
        const response = await fetch(`${API_BASE_URL}/records`);
        const records = await response.json();
        displayRecords(records);
        updateTotalAmount(records);
        updatePagination(records);
    } catch (error) {
        console.error('Error fetching records:', error);
        showAlert('Failed to fetch records', 'danger');
    }
}

// Display records in table
function displayRecords(records) {
    recordTable.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
    const paginatedRecords = records.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    
    paginatedRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.description}</td>
            <td>$${record.amount.toFixed(2)}</td>
            <td>${formatDate(record.date)}</td>
            ${window.location.pathname.includes('admin.html') ? 
                `<td>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('${record._id}')">Delete</button>
                </td>` : ''}
        `;
        recordTable.appendChild(row);
    });
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Update total amount display
function updateTotalAmount(records) {
    if (totalAmountElement) {
        const total = records.reduce((sum, record) => sum + record.amount, 0);
        totalAmountElement.textContent = `$${total.toFixed(2)}`;
    }
}

// Handle form submission (admin only)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description, amount, date }),
        });
        
        if (response.ok) {
            document.getElementById('incomeForm').reset();
            setCurrentDate();
            fetchRecords();
            showAlert('Record added successfully', 'success');
        } else {
            throw new Error('Failed to add record');
        }
    } catch (error) {
        console.error('Error adding record:', error);
        showAlert('Failed to add record', 'danger');
    }
}

// Delete record (admin only)
async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/records/${id}`, {
            method: 'DELETE',
        });
        
        if (response.ok) {
            fetchRecords();
            showAlert('Record deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete record');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showAlert('Failed to delete record', 'danger');
    }
}

// Pagination functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        fetchRecords();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        fetchRecords();
    }
}

function updatePagination(records) {
    if (pageInfoElement) {
        totalPages = Math.ceil(records.length / RECORDS_PER_PAGE);
        pageInfoElement.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

// Print records
function printRecords() {
    window.print();
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Make functions available globally
window.deleteRecord = deleteRecord;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.printRecords = printRecords;