/**
 * Elysr Medical - Google Sheets Webhook
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.parameter.data);
    var sheetName = data.orderType === "wholesale" ? "الوكلاء والتجار" : "الطلبات";
    var sheet = getOrCreateSheet(sheetName);

    if (data.orderType === "wholesale") {
      var notes = data.notes || "";
      var m = notes.match(/النشاط:\s*(.+)/);
      var business = m ? m[1].trim() : "";
      var rest = notes.replace(/النشاط:\s*.+/, "").trim();
      sheet.appendRow([now(), data.orderId, data.customerName, business, data.customerPhone, data.governorate, data.address, rest, data.paymentMethod, "جديد"]);
    } else {
      var items = (data.items || []).map(function(it) { return it.name + " × " + it.qty + " = " + (it.price * it.qty) + " ج.م"; }).join(" | ");
      sheet.appendRow([now(), data.orderId, data.customerName, data.customerPhone, data.governorate, data.address, items, data.total, data.notes, data.paymentMethod]);
    }
    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

function doGet() {
  return json({ status: "Elysr Webhook Active", version: "4.0" });
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    if (name === "الطلبات") {
      s.appendRow(["التاريخ","رقم الطلب","اسم العميل","الهاتف","المحافظة","العنوان","المنتجات","الإجمالي","ملاحظات","طريقة الدفع"]);
    } else {
      s.appendRow(["التاريخ","رقم الطلب","اسم العميل","النشاط","الهاتف","المحافظة","المدينة","ملاحظات","طريقة الدفع","الحالة"]);
    }
    s.setFrozenRows(1);
    s.getRange(1,1,1,10).setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");
    s.autoResizeColumns(1, 10);
  }
  return s;
}

function now() {
  var d = new Date();
  var h = d.getHours();
  return d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear() + " " + (h%12||12) + ":" + ("0"+d.getMinutes()).slice(-2) + " " + (h>=12?"م":"ص");
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
