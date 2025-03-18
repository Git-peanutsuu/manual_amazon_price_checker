// 手動でAmazonの商品価格を追跡し、ユーザーのスプレッドシートに記録するWebアプリ

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}
function processInput(url, price) {
  const asin = extractAsinFromUrl(url) || "NO_ASIN";
  if (!url) return "URLを入力してください。";

  let spreadsheet; // 外で宣言

  try {
    // ユーザーごとのスプレッドシートを取得または作成
    const userProperties = PropertiesService.getUserProperties();
    let sheetId = userProperties.getProperty('USER_SHEET_ID');
    
    if (!sheetId) {
      spreadsheet = SpreadsheetApp.create('AmazonPriceTracker');
      sheetId = spreadsheet.getId();
      userProperties.setProperty('USER_SHEET_ID', sheetId);
    } else {
      spreadsheet = SpreadsheetApp.openById(sheetId);
    }

    const sheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.insertSheet('Sheet1');

      // ヘッダーを強制的に1行目に設定
    sheet.getRange("A1:F1").setValues([['最終更新日時', '商品', 'URL', '前回の値段', '最高値', '最安値']]);
    
      // 2行目以降のデータを取得
    const lastRow = sheet.getLastRow();
    const data = lastRow > 1 ? sheet.getRange("A2:F" + lastRow).getValues() : [];
    const now = new Date();
    const currentPrice = parseFloat(price) || 0;
    
      // 既存データを検索
    let rowIndex = -1;
    let pastPrice = null;
    let maxPrice = currentPrice;
    let minPrice = currentPrice;
    
    for (let i = 0; i < data.length; i++) {
      const rowAsin = String(data[i][1]).trim();
      if (rowAsin === asin) {
        rowIndex = i + 2;
        pastPrice = parseFloat(data[i][3]);
        maxPrice = Math.max(parseFloat(data[i][4]), currentPrice);
        minPrice = Math.min(parseFloat(data[i][5]), currentPrice);
        break;
      }
    }
      // データ更新または追加
    if (rowIndex === -1) {
      sheet.appendRow([now, asin, url, currentPrice, currentPrice, currentPrice]);
      return `初回登録: 商品=${asin}, 価格=${currentPrice}円`;
    } else {
      sheet.getRange(rowIndex, 1, 1, 6).setValues([[now, asin, url, pastPrice, maxPrice, minPrice]]);
      const diff = currentPrice - pastPrice;
      if (diff < 0) {
        return `価格が下がりました！ 前回: ${pastPrice}円, 今回: ${currentPrice}円 (差額: ${diff}円), 最高: ${maxPrice}円, 最安: ${minPrice}円`;
      } else if (diff > 0) {
        return `価格が上がりました。 前回: ${pastPrice}円, 今回: ${currentPrice}円 (差額: +${diff}円), 最高: ${maxPrice}円, 最安: ${minPrice}円`;
      } else {
        return `価格は変わっていません: ${currentPrice}円, 最高: ${maxPrice}円, 最安: ${minPrice}円`;
      }
    }
  } catch (e) {
    return `エラーが発生しました: ${e.message}`; // ユーザーにエラー表示
  }
}

function extractAsinFromUrl(url) {
  const regex = /dp\/([A-Z0-9]{10})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
function resetUserSheetId() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('USER_SHEET_ID');
  return "USER_SHEET_IDをリセットしました";
}
