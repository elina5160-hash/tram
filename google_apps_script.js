function doPost(e) {
  // Открываем активную таблицу и лист
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    // Получаем и разбираем данные из POST-запроса
    var data = JSON.parse(e.postData.contents);
    
    // Проверяем, что пришли данные в формате { values: [...] }
    if (data.values && Array.isArray(data.values)) {
      // Добавляем готовую строку в таблицу
      sheet.appendRow(data.values);
      return ContentService.createTextOutput("OK");
    } else {
      return ContentService.createTextOutput("Error: No 'values' array found in payload");
    }
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString());
  }
}
