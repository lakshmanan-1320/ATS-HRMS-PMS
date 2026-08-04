const dbDefault = require('../config/db');

async function nextCode(dbExecutor, clientId) {
  const db = dbExecutor || dbDefault;
  const prefRow = await db.query('SELECT emp_code_prefix FROM companies WHERE id=1');
  const prefix = (prefRow.rows[0]?.emp_code_prefix || 'EMP').toUpperCase();
  const mx = await db.query('SELECT COUNT(employee_id) AS mx FROM employees WHERE organization_id=$1', [clientId]);
  const seq = parseInt(mx.rows[0].mx, 10) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function wouldCreateCycle(dbExecutor, clientId, empId, newManagerId) {
  if (!newManagerId) return false;
  const db = dbExecutor || dbDefault;
  const empIdStr = empId;
  let current = newManagerId;
  if (current === empIdStr) return true;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const row = await db.query(
      'SELECT manager_employee_id FROM employees WHERE employee_id=$1 AND organization_id=$2',
      [current, clientId]
    )
    if (!row.rows.length) break;
    const { manager_employee_id } = row.rows[0];
    if (!manager_employee_id) break;
    if (manager_employee_id === empIdStr) return true;
    current = manager_employee_id;
  }
  return false;
}

function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  const val = parseFloat(num);
  if (val === 0) return 'Rupees Zero Only';
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const integerPart = Math.floor(val);
  const decimalPart = Math.round((val - integerPart) * 100);
  
  function convert(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }
  
  let str = 'Rupees ' + convert(integerPart);
  
  if (decimalPart > 0) {
    str += ' and ' + convert(decimalPart) + ' Paise';
  }
  
  return str + ' Only';
}

module.exports = {
  nextCode,
  wouldCreateCycle,
  numberToWords,
};
