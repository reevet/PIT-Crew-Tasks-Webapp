/**
 * This package of server- and client-side code is designed to help interface
 * with the spreadsheet of tasks to work on. This makes a short task list in 
 * table form, and allows a detail view in order to update individual tasks.
 *
 * @summary A mobile-friendly user interface for the task list spreadsheet.
 *
 * @author    Tom Reeve, Holliston High
 * @requires  javascriptlibrary.js
 */

// @constants {string} SPREADSHEET_ID and SHEET_NAME Links to the correct Google Sheet
var SPREADSHEET_ID = "1Vd1dnD05IeanjGKx1XGyPeE04q8IWexDq1vE2dK9o3k";
var SHEET_NAME = "Task Log";

// @constants {string} xx_TEXT Expected values of the spreadsheet's headers
// These must be updated here if anyone edits the spreadsheet's headers
// Note: the ORDER of the headers does not matter, but the text must match exactly
var ID_TEXT = "ID";
var TIMESTAMP_TEXT = "Timestamp";
var STATUS_TEXT = "Status";
var ISSUE_TEXT = "Description of Problem";
var TEACHER_TEXT = "Name";
var REQUESTER_TEXT = "Email Address";
var ROOM_TEXT = "Room # or Chromebook #";
var DATEWORKED_TEXT = "Date worked on";
var STUDENTS_TEXT = "PIT Crew Worker Initials";
var COMMENTS_TEXT = "Resolution Description";

/**
 * @summary Starts the script running.
 *
 * doGet() is the first function called when the script is loaded and run 
 * (usually when called via browser in a webpage). It loads the HTML template
 * file and returns the HTML to the browser. The HTML code has special tags that
 * allow the HtmlService to insert data into the HTML during creation.
 *
 * @return {string} HTML to display.
 */
function doGet() {
  return HtmlService
      .createTemplateFromFile('HTML Template')
      .evaluate();
}

/**
 * @summary Embeds additional HTML files.
 *
 * This is called from within the HTML template file in order to attach
 * additional HTML. Typical usage is to call CSS stylesheets or client-
 * side scripts from other files. This allows for cleaner, segregated code.
 *
 * @param {string} filename The name of the file to include (shown in left bar
 *                        of the Apps Script editing window)
 * @return {string} HTML to embed
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

/**
 * @summary Gathers summary data of every row in the spreadsheet.
 *
 * This looks through every row of the task sheet spreadsheet and
 * returns a 2D array object of shortened data (e.g. shortened dates etc.) 
 *
 * @param {string} filter A string to restricting the data call by Status.
 *                      Accepted values: "Done", "Waiting", "Open", "OpenWaiting"
 *                                       or ("" or null) for no filter
 * @return {object} (2D array)
 */
function getData(filterString) {
  
  // creates filter matching strings based on which filters are active
  var filterOpen = filterString.indexOf("Open")>=0 ? "Open" : "notactive";
  var filterWaiting = filterString.indexOf("Waiting")>=0 ? "Waiting" : "notactive";
  var filterDone = filterString.indexOf("Done")>=0 ? "Done" : "notactive";
  
  // gets the spreadsheet data
  var data = SpreadsheetApp
      .openById(SPREADSHEET_ID)
      .getSheetByName(SHEET_NAME)
      .getDataRange()
      .getValues();
  
  // builds an associative array of the positions of each header
  var headerArray = buildHeaderArray(data[0]); 
  
  // the array to be returned
  var vals = new Array();   
  
  //cycles through each row of data
  for (var i=1; i<data.length; i++) {  //starting at 1 to skip headers
    var row = data[i];
    var status = row[headerArray[STATUS_TEXT]]; 
    
    // determines if this row should be included based on the filter
    if ((status == filterOpen) || (status == filterWaiting) || (status == filterDone)) {
      
      // creates a row of data...
      var valrow = [];
      
      // ... with these values
      var id =         row[headerArray[ID_TEXT]];
      var status =     row[headerArray[STATUS_TEXT]];
      var date =       new Date(row[headerArray[TIMESTAMP_TEXT]]);
      var room =       row[headerArray[ROOM_TEXT]];
      var issue =      row[headerArray[ISSUE_TEXT]];
      var teacher =    row[headerArray[TEACHER_TEXT]];
      var requester =  row[headerArray[REQUESTER_TEXT]];
      var students =   row[headerArray[STUDENTS_TEXT]];
      var dateWorked = new Date(row[headerArray[DATEWORKED_TEXT]]);
      var comments =   row[headerArray[COMMENTS_TEXT]];
      
      // Formats the dates. Should these be client-side?      
      var dateStr = (date.getMonth()+1) +"/"+ date.getDate()+"/"+ date.getFullYear(); 
      var dateWorkedStr = "";
      if (!isNaN(dateWorked.getMonth())) {  // Formats only if dateWorked is present
        dateWorkedStr = (dateWorked.getMonth()+1) +"-"+ dateWorked.getDate()+"-"+ dateWorked.getFullYear(); 
      } 
                  
      // Gathers the data into the array to return
      valrow.push(id);
      valrow.push(status);
      valrow.push(dateStr);                     
      valrow.push(room);
      valrow.push(issue);
      valrow.push(teacher);
      valrow.push(requester);
      valrow.push(students);
      valrow.push(dateWorkedStr);
      valrow.push(comments);
      
    // Adds the single row array as another row in the main 2D array
    vals.push(valrow);
    }
  }
  // returns a stringified version of the 2d array.
  // (must be stringified in order to send complex data like dates)
  return JSON.stringify(vals);
}

/**
 * @summary Updates a record.
 *
 * This changes the status of a task, and updates the data in the other fields 
 *
 * @param array values The list of values gathered from the form
 * @return object (2D array) the new summary values of all rows in the spreadsheet
 */
function saveData(values) {

  //the expected order of values contained in the 'values' array
  var valuesOrder = [ID_TEXT,
                     STATUS_TEXT,
                     STUDENTS_TEXT,
                     COMMENTS_TEXT,
                     TIMESTAMP_TEXT,
                     ROOM_TEXT,
                     ISSUE_TEXT,
                     TEACHER_TEXT,
                     DATEWORKED_TEXT];
  
  // gets the spreadsheet data
  var data = SpreadsheetApp
      .openById(SPREADSHEET_ID)
      .getSheetByName(SHEET_NAME)
      .getDataRange()
      .getValues();
  
  // builds an associative array of the positions of each header
  var headerArray = buildHeaderArray(data[0]); 
    
  // Converts request date string into a Date object
  if (values[4] != "") { 
      values[4] = new Date(values[4]);
  } else {
    values[4] = new Date();
  }
  // auto-adds the current date for dateWorked
  values[8] = new Date();
  
  // Cycles through rows in spreadsheet
  for (var i=1; i<data.length; i++) {
    var row = data[i];
    var id = row[headerArray[ID_TEXT]];
    var requestedId = values[0];
    
    if (requestedId == id) {
      
      // Cycles through the values array
      for (var j=0; j<values.length; j++) {
        // Prevents a NULL entry into the spreadsheet
        var text = "";
        if (values[j]) {
          text=values[j];  
        }
        
        // Places the new value in the correct spreadsheet column
        var cell = SpreadsheetApp
          .openById(SPREADSHEET_ID)
          .getSheetByName(SHEET_NAME)
          .getRange(i+1, headerArray[valuesOrder[j]]+1);
        cell.setValue(text); 
      }
      
      Logger.log("Status and info updated for ID="+requestedId);
      return "true";
    }
  }
  // TODO: throw error if code reaches here (No ID found)
  return "unknown";
}

/**
 * @summary Returns the three-letter abbreviation of a month's name.
 *
 * Should this be client-side? And why isn't this a built-in Javascript function?
 *
 * @param integer month The (0-based) month number (ie. Jan=0, Feb=1, etc).
 * @return string The abbreviation (e.g "Jan", "Feb" etc).
 */
function getMonth3(month) {
  var returnString = ""
  var monthArray = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  if ((month >=0) && (month < monthArray.length)) {
    returnString = monthArray[month];
  }
  return returnString;
}

/**
 * @summary Fills an associative array that returns a col number for given text
 * Example: headerArray[STATUS_TEXT] = 2
 *
 * @param array headers The first row of the spreadsheet, in actual order
 */

function buildHeaderArray(headers) {
  var headerArray = [];
  for (var i=0; i<headers.length; i++) {
    headerArray[headers[i]] = i;
  }
  return headerArray;
}
