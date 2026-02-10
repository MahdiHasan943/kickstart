const ExcelJS = require('exceljs');
console.log('Require successful');
try {
    const wb = new ExcelJS.Workbook();
    console.log('Workbook created');
} catch (e) {
    console.error('Error creating workbook:', e);
}
