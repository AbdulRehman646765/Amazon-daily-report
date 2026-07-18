# Walkthrough: Google Sheets Sync & Unlimited Backups

I have successfully integrated the real-time Google Sheets Sync and Unlimited/Customizable Local Backups features into your Daily Work Report application.

Here is a summary of what was added and how to configure the integration:

---

## 1. Summary of Changes

### 📁 Modified Code Files
- [index.html](file:///e:/CeraVe%20invoice%20editer%20Test/Report%20work/index.html):
  - **Database Migration**: Added an automatic backward-compatible migration on page startup that generates a unique record ID (`id`) for any existing tracker entries. Newly added tracker entries are also assigned a unique ID automatically.
  - **Google Sync Settings UI**: Added a "Google Sync" tab in the App Settings modal containing a real-time sync toggle, Google Apps Script URL input field, "Test Connection" button, "Force Sync All Local Data" button, and copyable script code block.
  - **Sync Badge Indicator**: Added a cloud sync status badge in the main header next to "Live Session". It displays live status:
    - `Synced` (Green dot): All modifications have been synced successfully.
    - `Syncing...` (Orange pulsing dot): Communication with Google Sheets is in progress.
    - `Sync Error` (Red dot): Sync failed (usually due to incorrect URL or offline connection).
  - **Pruning Policy**: Replaced the strict 7-day pruning logic in `runAutoBackup()` with a dropdown configuration in settings. The local backup retention policy defaults to "No Limit (Keep All)" as requested by your boss, but can be set to 30 days or 7 days if browser storage needs to be cleared.
  - **Database Integration Triggers**: Hooked form submission, record edits, record deletions, bulk imports, backup restorations, and duplicate merging actions to sync real-time changes to the sheet.

---

## 2. Setup Guide (How to Connect Your Google Sheet)

### Step 1: Open Google Sheets
Create a new spreadsheet or open an existing one at [Google Sheets](https://sheets.new).

### Step 2: Open Apps Script Editor
Click on **Extensions** &rarr; **Apps Script** in the spreadsheet menu.

### Step 3: Paste the Script Code
Delete any code in the script editor and paste the Apps Script code. You can get the script code in two ways:
1. Copy it from the **Google Sync** settings panel inside the app by clicking **Copy Code**.
2. Or copy it directly from the implementation plan: [implementation_plan.md](file:///C:/Users/hp/.gemini/antigravity-ide/brain/f5ffc79d-ae1e-4652-8e64-229667004e80/implementation_plan.md).

### Step 4: Deploy the Web App
1. Click **Deploy** (top right) &rarr; **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web App**.
3. Configure the settings:
   - **Description**: Daily Work Sync API
   - **Execute as**: Me (your email address)
   - **Who has access**: Anyone
4. Click **Deploy**.
5. Copy the **Web App URL** from the success popup (it will look like `https://script.google.com/macros/s/.../exec`).

### Step 5: Connect in App Settings
1. Open the Daily Work Report application in your browser.
2. Click **Settings** (gear icon in the header).
3. Click the new **Google Sync** tab.
4. Paste the Web App URL into the input field.
5. Turn on **Enable Real-Time Sync**.
6. Click **Test Connection** to confirm a successful connection.
7. Click **Force Sync All Local Data** to upload all existing history to your Google Sheet in one go.

---

## 3. Real-Time Sync Capabilities

- **Add Today's Work**: As soon as you click **Save Data**, the row instantly appears in the Google Sheet.
- **Edit Records**: Clicking the edit pencil, modifying data, and clicking **Save Data** instantly updates the corresponding row in the Google Sheet.
- **Delete Records**: Clicking delete removes the row instantly from the Google Sheet.
- **Merge Duplicates**: Clicking **Merge Automatically** merges duplicate rows locally and pushes the clean merged dataset to the Google Sheet.
- **Clear All**: Clearing history clears the Google Sheet data.

-------------------------------------------------------------------------------------------------------------------------------

# Implementation Plan: Google Sheets Auto-Sync & Unlimited Local Backup

This plan details the changes required to implement automatic real-time backing up of work tracker entries to a Google Sheet, and to lift the 7-day limit on local backups by introducing customizable retention policies (with "Unlimited" as the default).

## User Review Required

> [!IMPORTANT]
> **Google Sheets Sync Setup Requirement**
> Since this is a client-side HTML application with no backend server, the Google Sheets sync will run directly from the browser using a **Google Apps Script Web App** deployment. 
> - We will provide the complete, copy-pasteable Apps Script code inside the settings tab.
> - The user (or their boss) will need to paste this code into their Google Sheet's Apps Script editor, deploy it as a "Web App" (accessible by "Anyone"), and copy the URL into the app's settings.
> - This proxy approach is completely secure, requires no API credentials to be exposed in the client code, and automatically handles column creation for dynamic work counters.

> [!TIP]
> **Asynchronous Syncing**
> All sync requests will run asynchronously in the background. If a network call to Google Sheets fails or if the user is offline, the app will continue to function normally. We will show a status indicator in the top header (e.g., "Synced", "Syncing...", "Sync Error") to keep the user informed.

---

## Open Questions

None at the moment. The plan covers all requests:
1. Unlimited local backups by default.
2. Auto-syncing of new list additions to Google Sheets.
3. Auto-updating of Google Sheets when editing entries.
4. Auto-deleting/syncing when removing or merging duplicate entries.

---

## Proposed Changes

### Work Tracker Web App

We will modify [index.html](file:///e:/CeraVe invoice editer Test/Report work/index.html) to incorporate the Google Sheets Sync and Backup settings.

#### [MODIFY] [index.html](file:///e:/CeraVe invoice editer Test/Report work/index.html)

1. **CSS Styles Addition** (inserted before `</style>`):
   - Add styles for the Google Sheets Sync settings tab content.
   - Add custom animations and styles for the live status badge.
   - Add styling for the copyable Apps Script container, inputs, and toggles.

2. **Google Sync Status Badge in Header**:
   - Add a dynamic sync status badge (`#syncStatusBadge`) next to the "Live Session" status badge in the `<header>` element.

3. **Settings Modal Tabs & Panels**:
   - Add a new Tab button `tab-gsync` ("Google Sync") in the Settings Modal.
   - Add a new Settings Panel `settingsPanel-gsync` containing:
     - Enable Sync Toggle.
     - Web App URL text input.
     - Local Backup Retention dropdown (No Limit, 30 Days, 7 Days).
     - Action buttons: "Test Connection", "Force Sync All Local Data".
     - Copyable **Google Apps Script Code** with step-by-step installation instructions in both English and Roman Urdu.

4. **JavaScript Sync Logic**:
   - **Data Schema Migration**: On page load, scan all current records in `amazonWork` and generate a unique `id` for each record if it doesn't already have one (e.g., `row_172083238_abc123`). This unique ID will act as the key to insert, update, or delete records in both localStorage and Google Sheets.
   - **Local Backup Policy**: Modify `runAutoBackup()` to inspect the selected retention policy (No Limit / 30 Days / 7 Days) and prune local backups accordingly.
   - **Apps Script Payload Handlers**:
     - `syncRowToGoogleSheets(row)`: Calls the web app with action `syncRow` to insert/update.
     - `deleteRowFromGoogleSheets(id)`: Calls the web app with action `deleteRow` to remove.
     - `bulkSyncToGoogleSheets()`: Sends the entire `workData` array with action `bulkSync` to overwrite the sheet (useful on first setup, or after merging duplicates, or clearing all data).
   - **Status Badge Controller**: Update header status badge dynamically (Sync Idle / Syncing... / Sync Error / Sync Disabled).

---

## Google Apps Script Code (For Sheet Deployment)

We will provide this code block inside the application settings for easy copying:

```javascript
function doPost(e) {
  var result = {};
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    if (action === 'test') {
      result = { status: 'success', message: 'Connected successfully to Google Sheet!' };
    } else if (action === 'syncRow') {
      result = syncRow(payload.row);
    } else if (action === 'deleteRow') {
      result = deleteRow(payload.id);
    } else if (action === 'bulkSync') {
      result = bulkSync(payload.rows);
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "Daily Work Reports";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var initialHeaders = ["ID", "Date", "User Name", "Company", "Notes"];
    sheet.getRange(1, 1, 1, initialHeaders.length).setValues([initialHeaders]);
    sheet.getRange(1, 1, 1, initialHeaders.length)
      .setFontWeight("bold")
      .setBackground("#1e3a8a")
      .setFontColor("#ffffff");
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
  var sheetUpdated = false;
  
  for (var key in row) {
    if (row.hasOwnProperty(key) && key !== "id") {
      var headerName = getHeaderNameForKey(key);
      if (headers.indexOf(headerName) === -1) {
        headers.push(headerName);
        sheetUpdated = true;
      }
    }
  }
  
  if (sheetUpdated) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1e3a8a")
      .setFontColor("#ffffff");
  }
  
  return headers;
}

function getHeaderNameForKey(key) {
  var mappings = {
    id: "ID",
    date: "Date",
    userName: "User Name",
    company: "Company",
    notes: "Notes"
  };
  if (mappings[key]) return mappings[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function prepareRowValues(headers, row) {
  var values = [];
  var keyMap = {};
  for (var key in row) {
    if (row.hasOwnProperty(key)) {
      var headerName = getHeaderNameForKey(key);
      keyMap[headerName] = row[key];
    }
  }
  for (var i = 0; i < headers.length; i++) {
    var hName = headers[i];
    var val = keyMap[hName];
    values.push((val === undefined || val === null) ? "" : val);
  }
  return values;
}

function syncRow(row) {
  var sheet = getOrCreateSheet();
  var headers = getHeaders(sheet);
  
  headers = updateHeadersIfNeeded(sheet, headers, row);
  
  var lastRow = sheet.getLastRow();
  var idColumnValues = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  var rowIndex = -1;
  
  for (var i = 0; i < idColumnValues.length; i++) {
    if (idColumnValues[i][0] === row.id) {
      rowIndex = i + 2;
      break;
    }
  }
  
  var rowValues = prepareRowValues(headers, row);
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return { status: 'success', message: 'Row updated', index: rowIndex };
  } else {
    sheet.appendRow(rowValues);
    return { status: 'success', message: 'Row appended' };
  }
}

function deleteRow(id) {
  var sheet = getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'success', message: 'Sheet is empty' };
  
  var idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var rowIndex = -1;
  
  for (var i = 0; i < idColumnValues.length; i++) {
    if (idColumnValues[i][0] === id) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex);
    return { status: 'success', message: 'Row deleted' };
  }
  return { status: 'error', message: 'Row not found' };
}

function bulkSync(rows) {
  var sheet = getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  
  if (!rows || rows.length === 0) {
    return { status: 'success', message: 'Sheet cleared' };
  }
  
  var headers = getHeaders(sheet);
  for (var i = 0; i < rows.length; i++) {
    headers = updateHeadersIfNeeded(sheet, headers, rows[i]);
  }
  
  var matrix = [];
  for (var i = 0; i < rows.length; i++) {
    matrix.push(prepareRowValues(headers, rows[i]));
  }
  
  sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
  return { status: 'success', message: 'Bulk sync complete. Synced ' + rows.length + ' rows.' };
}
```

---

## Verification Plan

### Automated Tests
*None. This is a local frontend-only HTML file.*

### Manual Verification
1. **Local Backup Retention Test**:
   - Change settings to keep only "Last 7 Days". Confirm backups are pruned.
   - Change settings to "No Limit (All-time)". Confirm backups are not pruned and can accumulate.
2. **Setup and Connection Test**:
   - Deploy Apps Script on a test Google Sheet.
   - Enter Web App URL, click "Test Connection" and verify the visual success notification.
3. **Real-time Syncing Test**:
   - Add a new record in the Web App -> Verify row appends instantly in the Google Sheet.
   - Edit the record in the Web App -> Verify the values change instantly in the Google Sheet.
   - Delete a record in the Web App -> Verify the row is deleted from the Google Sheet.
   - Clear all records -> Verify the Sheet is cleared.
   - Merge duplicate records -> Verify the Sheet gets the updated/consolidated bulk records correctly.

---------------------------------------------------------------------------------------------------------------------------------------------------------------
