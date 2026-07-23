// ================================================================
// Daily Work Report - Google Apps Script (Enhanced Version)
// Features: All Data sheet, User sheets, Dashboard calculations,
//           Archive & Restore System with Formatting Preservation,
//           Duplicate Records Validation & Comprehensive Error Logging.
// ================================================================

function doPost(e) {
  var result = {};
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No payload received' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    Logger.log("Received action: " + action);

    if (action === 'test') {
      result = { status: 'success', message: 'Connected successfully to Google Sheet!' };
    } else if (action === 'syncRow') {
      result = syncRow(payload.row);
    } else if (action === 'deleteRow') {
      result = deleteRow(payload.id, payload.userName);
    } else if (action === 'bulkSync') {
      result = bulkSync(payload.rows);
    } else if (action === 'archiveEmployee') {
      result = archiveEmployee(payload.userName, payload.archiveData);
    } else if (action === 'restoreEmployee') {
      result = restoreEmployee(payload.userName, payload.workRecords);
    } else if (action === 'deleteArchived') {
      result = deleteArchived(payload.userName);
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    Logger.log("Error processing request: " + err.toString());
    result = { status: 'error', message: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ---- Column Name Mappings ----
var HEADER_MAP = {
  id:          'ID-NO',
  date:        'Date',
  userName:    'User Name',
  company:     'Company',
  invoice:     'Made Invoices',
  submission:  'Submission',
  cases:       'Case Open',
  reopen:      'Reopen Case',
  approval:    'Approval',
  ungate:      'Auto Ungate',
  copyListing: 'Copy Listing'
};
var EXCLUDED_KEYS = ['notes'];
var COUNTER_KEYS  = ['invoice','submission','cases','reopen','approval','ungate','copyListing'];

function getHeaderNameForKey(key) {
  if (HEADER_MAP[key]) return HEADER_MAP[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function isExcluded(key) {
  return EXCLUDED_KEYS.indexOf(key) !== -1;
}

// ---- Initial Headers ----
var INITIAL_HEADERS = ['ID-NO', 'Date', 'User Name', 'Company',
  'Made Invoices', 'Submission', 'Case Open', 'Reopen Case',
  'Approval', 'Auto Ungate', 'Copy Listing'];

// ---- Sheet Helpers with Strict Formatting Preservation ----
function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Apply styling ONLY on initial creation
    sheet.getRange(1, 1, 1, INITIAL_HEADERS.length)
      .setValues([INITIAL_HEADERS])
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

function updateHeadersIfNeeded(sheet, currentHeaders, row) {
  var headers = currentHeaders.slice();
  var updated = false;
  for (var key in row) {
    if (!row.hasOwnProperty(key)) continue;
    if (key === 'id') continue;            // handled as ID-NO
    if (isExcluded(key)) continue;         // skip notes
    var hName = getHeaderNameForKey(key);
    if (headers.indexOf(hName) === -1) {
      headers.push(hName);
      updated = true;
    }
  }
  if (updated) {
    // Only update values without touching existing header styling
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function prepareRowValues(headers, row) {
  var keyMap = {};
  for (var key in row) {
    if (!row.hasOwnProperty(key)) continue;
    if (isExcluded(key)) continue;
    var hName = getHeaderNameForKey(key);
    keyMap[hName] = row[key];
  }
  var values = [];
  for (var i = 0; i < headers.length; i++) {
    var val = keyMap[headers[i]];
    values.push((val === undefined || val === null) ? '' : val);
  }
  return values;
}

function findRowById(sheet, id) {
  if (!id) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

// Find existing record by Composite Key (Date + User Name + Company)
function findRowByCompositeKey(sheet, dateVal, userNameVal, companyVal) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var headers = getHeaders(sheet);
  var dateCol = headers.indexOf('Date');
  var userCol = headers.indexOf('User Name');
  var compCol = headers.indexOf('Company');
  if (dateCol === -1 || compCol === -1) return -1;

  var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var d = data[i][dateCol];
    var u = userCol !== -1 ? data[i][userCol] : '';
    var c = data[i][compCol];
    if (String(d).trim() === String(dateVal).trim() && 
        String(c).toLowerCase().trim() === String(companyVal).toLowerCase().trim() &&
        (!userNameVal || String(u).toLowerCase().trim() === String(userNameVal).toLowerCase().trim())) {
      return i + 2;
    }
  }
  return -1;
}

// ---- Sync a single row ----
function syncRow(row) {
  try {
    if (!row) return { status: 'error', message: 'No row data provided' };
    
    var userName = (row.userName && row.userName.trim()) ? row.userName.trim() : 'Unknown User';
    var sheets = [
      getOrCreateSheet(userName),
      getOrCreateSheet('All Data')
    ];
    
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var headers = getHeaders(sheet);
      headers = updateHeadersIfNeeded(sheet, headers, row);
      
      var rowIndex = findRowById(sheet, row.id);
      if (rowIndex === -1) {
        // Fallback validation: check composite key to prevent duplicates
        rowIndex = findRowByCompositeKey(sheet, row.date, row.userName, row.company);
      }

      var values = prepareRowValues(headers, row);
      if (rowIndex !== -1) {
        // Update VALUES ONLY (formatting, colors, fonts, widths preserved)
        sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
      } else {
        sheet.appendRow(values);
      }
    }
    
    updateDashboard();
    return { status: 'success', message: 'Row synced successfully.' };
  } catch (err) {
    Logger.log("Error in syncRow: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

// ---- Delete a row by ID ----
function deleteRow(id, userName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var name = sheet.getName();
      if (name === 'Dashboard' || name === 'Archive') continue;
      var rowIndex = findRowById(sheet, id);
      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex);
      }
    }
    updateDashboard();
    return { status: 'success', message: 'Row deleted from all sheets.' };
  } catch (err) {
    Logger.log("Error in deleteRow: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

// ---- Bulk Sync ----
function bulkSync(rows) {
  try {
    if (!rows || rows.length === 0) {
      return { status: 'success', message: 'No rows to sync.' };
    }

    // --- 1. All Data sheet ---
    var allSheet = getOrCreateSheet('All Data');
    var allLastRow = allSheet.getLastRow();
    var allLastCol = allSheet.getLastColumn() || INITIAL_HEADERS.length;
    
    // Clear CONTENTS ONLY (preserves all colors, borders, font styles, formatting)
    if (allLastRow > 1) {
      allSheet.getRange(2, 1, allLastRow - 1, allLastCol).clearContent();
    }
    var allHeaders = getHeaders(allSheet);
    for (var i = 0; i < rows.length; i++) {
      allHeaders = updateHeadersIfNeeded(allSheet, allHeaders, rows[i]);
    }
    var allMatrix = [];
    for (var i = 0; i < rows.length; i++) {
      allMatrix.push(prepareRowValues(allHeaders, rows[i]));
    }
    allSheet.getRange(2, 1, allMatrix.length, allHeaders.length).setValues(allMatrix);

    // --- 2. Individual user sheets ---
    var groups = {};
    for (var i = 0; i < rows.length; i++) {
      var key = (rows[i].userName && rows[i].userName.trim())
        ? rows[i].userName.trim()
        : 'Unknown User';
      if (!groups[key]) groups[key] = [];
      groups[key].push(rows[i]);
    }
    for (var uName in groups) {
      if (!groups.hasOwnProperty(uName)) continue;
      var uSheet = getOrCreateSheet(uName);
      var uLastRow = uSheet.getLastRow();
      var uLastCol = uSheet.getLastColumn() || INITIAL_HEADERS.length;
      if (uLastRow > 1) {
        uSheet.getRange(2, 1, uLastRow - 1, uLastCol).clearContent();
      }
      var uHeaders = getHeaders(uSheet);
      var uRows = groups[uName];
      for (var j = 0; j < uRows.length; j++) {
        uHeaders = updateHeadersIfNeeded(uSheet, uHeaders, uRows[j]);
      }
      var uMatrix = [];
      for (var j = 0; j < uRows.length; j++) {
        uMatrix.push(prepareRowValues(uHeaders, uRows[j]));
      }
      uSheet.getRange(2, 1, uMatrix.length, uHeaders.length).setValues(uMatrix);
    }

    // --- 3. Rebuild Dashboard ---
    updateDashboard();

    return { status: 'success', message: 'Bulk sync complete. Synced ' + rows.length + ' rows.' };
  } catch (err) {
    Logger.log("Error in bulkSync: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

// ---- Dashboard Builder ----
// Strictly preserves custom background colors, fonts, column widths, borders, etc.
function updateDashboard() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var dash = ss.getSheetByName('Dashboard');
    var isNewSheet = false;
    if (!dash) {
      dash = ss.insertSheet('Dashboard', 0);
      isNewSheet = true;
    } else {
      // Clear VALUES ONLY — preserve all owner custom formatting & designs
      dash.clearContents();
    }

    var allSheet = ss.getSheetByName('All Data');
    if (!allSheet || allSheet.getLastRow() <= 1) {
      dash.getRange(1, 1).setValue('No data to display yet.');
      return;
    }

    var allHeaders = allSheet.getRange(1, 1, 1, allSheet.getLastColumn()).getValues()[0];
    var allData    = allSheet.getRange(2, 1, allSheet.getLastRow() - 1, allSheet.getLastColumn()).getValues();

    var colIdx = {};
    for (var i = 0; i < allHeaders.length; i++) {
      colIdx[allHeaders[i]] = i;
    }

    var counterCols = ['Made Invoices','Submission','Case Open','Reopen Case','Approval','Auto Ungate','Copy Listing'];
    var activeCols = [];
    for (var i = 0; i < counterCols.length; i++) {
      if (colIdx[counterCols[i]] !== undefined) activeCols.push(counterCols[i]);
    }

    var knownCols = ['ID-NO','Date','User Name','Company','Made Invoices','Submission',
      'Case Open','Reopen Case','Approval','Auto Ungate','Copy Listing'];
    for (var i = 0; i < allHeaders.length; i++) {
      if (knownCols.indexOf(allHeaders[i]) === -1 && activeCols.indexOf(allHeaders[i]) === -1) {
        activeCols.push(allHeaders[i]);
      }
    }

    var userTotals = {};
    var userColIdx = colIdx['User Name'];
    for (var r = 0; r < allData.length; r++) {
      var uName = (userColIdx !== undefined ? allData[r][userColIdx] : '') || 'Unknown';
      if (!userTotals[uName]) {
        userTotals[uName] = {};
        for (var c = 0; c < activeCols.length; c++) userTotals[uName][activeCols[c]] = 0;
      }
      for (var c = 0; c < activeCols.length; c++) {
        var cIdx = colIdx[activeCols[c]];
        if (cIdx !== undefined) {
          userTotals[uName][activeCols[c]] += Number(allData[r][cIdx]) || 0;
        }
      }
    }

    var dashRow = 1;
    var headerRow = ['User Name'];
    for (var c = 0; c < activeCols.length; c++) headerRow.push(activeCols[c]);

    dash.getRange(dashRow, 1).setValue('DAILY WORK REPORT — DASHBOARD');
    if (isNewSheet) {
      dash.getRange(dashRow, 1, 1, headerRow.length).merge()
        .setBackground('#1e3a8a')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(14)
        .setHorizontalAlignment('center');
    }
    dashRow += 2;

    dash.getRange(dashRow, 1, 1, headerRow.length).setValues([headerRow]);
    if (isNewSheet) {
      dash.getRange(dashRow, 1, 1, headerRow.length)
        .setFontWeight('bold')
        .setBackground('#ff9900')
        .setFontColor('#111111')
        .setHorizontalAlignment('center');
    }
    dashRow++;

    var uNames = Object.keys(userTotals);
    var grandTotals = {};
    for (var c = 0; c < activeCols.length; c++) grandTotals[activeCols[c]] = 0;

    for (var u = 0; u < uNames.length; u++) {
      var uName = uNames[u];
      var dataRow = [uName];
      for (var c = 0; c < activeCols.length; c++) {
        var val = userTotals[uName][activeCols[c]] || 0;
        dataRow.push(val);
        grandTotals[activeCols[c]] += val;
      }
      dash.getRange(dashRow, 1, 1, dataRow.length).setValues([dataRow]);
      if (isNewSheet) {
        dash.getRange(dashRow, 1, 1, dataRow.length)
          .setBackground(u % 2 === 0 ? '#ffffff' : '#eff6ff');
        dash.getRange(dashRow, 1).setFontWeight('bold').setFontColor('#1e3a8a');
      }
      dashRow++;
    }

    var totalRow = ['TOTAL'];
    for (var c = 0; c < activeCols.length; c++) totalRow.push(grandTotals[activeCols[c]]);
    dash.getRange(dashRow, 1, 1, totalRow.length).setValues([totalRow]);
    if (isNewSheet) {
      dash.getRange(dashRow, 1, 1, totalRow.length)
        .setFontWeight('bold')
        .setBackground('#ff9900')
        .setFontColor('#111111');
      dash.autoResizeColumns(1, headerRow.length);
    }
  } catch (err) {
    Logger.log("Error in updateDashboard: " + err.toString());
  }
}

// ---- Archive Helpers ----
function getOrCreateArchiveSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "Archive";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = ['Employee Name', 'Archive Date', 'Archived By', 'Reason', 
                   'Total Invoices', 'Total Submissions', 'Total Cases', 
                   'Total Approvals', 'Total Auto Ungate', 'Total Copy Listing', 
                   'Last Working Date', 'Status'];
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#7c3aed')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function archiveEmployee(userName, archiveData) {
  try {
    Logger.log("Archiving employee: " + userName);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateArchiveSheet();
    
    var totals = (archiveData && archiveData.totals) ? archiveData.totals : {};
    var rowValues = [
      archiveData ? archiveData.name : userName,
      archiveData ? archiveData.archivedDate : new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      (archiveData && archiveData.archivedBy) ? archiveData.archivedBy : 'Owner',
      (archiveData && archiveData.archiveReason) ? archiveData.archiveReason : '-',
      totals.invoice || 0,
      totals.submission || 0,
      totals.cases || 0,
      totals.approval || 0,
      totals.ungate || 0,
      totals.copyListing || 0,
      (archiveData && archiveData.lastWorkingDate) ? archiveData.lastWorkingDate : '-',
      'Archived'
    ];

    // Prevent duplicate summary rows in Archive sheet: update if already exists
    var lastRow = sheet.getLastRow();
    var existingRow = -1;
    if (lastRow > 1) {
      var existingNames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingNames.length; i++) {
        if (existingNames[i][0] === userName) {
          existingRow = i + 2;
          break;
        }
      }
    }

    if (existingRow !== -1) {
      sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    // Delete User Sheet Tab if present
    var activeUserSheet = ss.getSheetByName(userName);
    if (activeUserSheet) {
      ss.deleteSheet(activeUserSheet);
    }

    // Remove rows from All Data
    var allSheet = ss.getSheetByName('All Data');
    if (allSheet) {
      var allLast = allSheet.getLastRow();
      if (allLast > 1) {
        var data = allSheet.getRange(2, 3, allLast - 1, 1).getValues(); // User Name is in col 3
        for (var r = data.length - 1; r >= 0; r--) {
          if (data[r][0] === userName) {
            allSheet.deleteRow(r + 2);
          }
        }
      }
    }

    // Re-calculate Dashboard
    updateDashboard();

    return { status: 'success', message: 'Employee "' + userName + '" archived successfully.' };
  } catch (err) {
    Logger.log("Error in archiveEmployee: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

function restoreEmployee(userName, workRecords) {
  try {
    Logger.log("Restoring employee: " + userName);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateArchiveSheet();
    var lastRow = sheet.getLastRow();

    // 1. Mark status as Restored in Archive sheet
    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === userName && data[i][11] === 'Archived') {
          sheet.getRange(i + 2, 12).setValue('Restored');
          break;
        }
      }
    }

    // 2. Re-create / get individual user sheet tab & write restored workRecords
    if (workRecords && workRecords.length > 0) {
      var uSheet = getOrCreateSheet(userName);
      var uHeaders = getHeaders(uSheet);
      for (var j = 0; j < workRecords.length; j++) {
        uHeaders = updateHeadersIfNeeded(uSheet, uHeaders, workRecords[j]);
      }
      var uMatrix = [];
      for (var j = 0; j < workRecords.length; j++) {
        uMatrix.push(prepareRowValues(uHeaders, workRecords[j]));
      }
      var uLastRow = uSheet.getLastRow();
      var uLastCol = uSheet.getLastColumn() || INITIAL_HEADERS.length;
      if (uLastRow > 1) {
        uSheet.getRange(2, 1, uLastRow - 1, uLastCol).clearContent();
      }
      uSheet.getRange(2, 1, uMatrix.length, uHeaders.length).setValues(uMatrix);

      // 3. Sync restored workRecords back to "All Data" sheet without duplicate entries
      var allSheet = getOrCreateSheet('All Data');
      var allHeaders = getHeaders(allSheet);
      for (var j = 0; j < workRecords.length; j++) {
        allHeaders = updateHeadersIfNeeded(allSheet, allHeaders, workRecords[j]);
        var existingIndex = findRowById(allSheet, workRecords[j].id);
        if (existingIndex === -1) {
          existingIndex = findRowByCompositeKey(allSheet, workRecords[j].date, workRecords[j].userName, workRecords[j].company);
        }
        var rowVals = prepareRowValues(allHeaders, workRecords[j]);
        if (existingIndex !== -1) {
          allSheet.getRange(existingIndex, 1, 1, rowVals.length).setValues([rowVals]);
        } else {
          allSheet.appendRow(rowVals);
        }
      }
    }

    // 4. Automatically refresh Dashboard
    updateDashboard();

    return { status: 'success', message: 'Employee "' + userName + '" restored successfully. User sheet, All Data & Dashboard synced.' };
  } catch (err) {
    Logger.log("Error in restoreEmployee: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

function deleteArchived(userName) {
  try {
    Logger.log("Deleting archived employee: " + userName);
    var sheet = getOrCreateArchiveSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = data.length - 1; i >= 0; i--) {
        if (data[i][0] === userName) {
          sheet.deleteRow(i + 2);
        }
      }
    }
    return { status: 'success', message: 'Archived record permanently deleted.' };
  } catch (err) {
    Logger.log("Error in deleteArchived: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}
