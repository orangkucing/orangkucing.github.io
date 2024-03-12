// change here! if column or sheet names are modified in the sheet
const selectA1 = {'著者・編者':'B', '読み':'C', 'シリーズ名':'D', '巻号':'E', 'タイトル':'F', '出版者':'G', '出版年':'H', '分類記号':'I', '配架場所':'K', 'NDL書誌ID':'J'};
const yomiIndex = 1;
const authorIndices = [0, yomiIndex];
const titleIndices = [2, 4];
const publisherIndex = 5;
const publishyearIndex = 6;
const NDLBibIDIndex = 9;
const sheetname = 'Sheet1';
//

const ro = new ResizeObserver((entries) => {
  setResultsSize();
});
new Promise((resolve) => {
  setTimeout(() => {
    let target;
    do {
      target = document.getElementById('wrapper');
    } while (!target);
    ro.observe(target);
  }, 1000); 
});

function setResultsSize() {
  var rectangleWithOutMargin = document.getElementById('wrapper');
  var resultWrapper = document.getElementById('result-wrapper');
  var rect = resultWrapper.getBoundingClientRect();
  var results = document.getElementById('results');
  if (rect.left == 0) { /* portlait */
    results.style.height = (rectangleWithOutMargin.getBoundingClientRect().height - rect.top) + "px";
    results.style.width = rectangleWithOutMargin.getBoundingClientRect().width + "px";
  } else { /* landscape */
    results.style.height = rectangleWithOutMargin.getBoundingClientRect().height + "px";
    results.style.width = (rectangleWithOutMargin.getBoundingClientRect().width - 280) + "px";
  }
}

function toKatakana(s) {
  return s.replace(/[ぁ-ゖ]/g, (s) => {return String.fromCharCode(s.charCodeAt(0) + 0x60);});
}

async function sendQuery(event) {
  var select = Object.keys(selectA1);
  var obj = {};
  for (let s of ['keyword', 'title', 'author', 'publisher']) {
    obj[s + 's'] = document.querySelector('input[name="' + s +'"]').value.replace(new RegExp('[\x20\u3000"]+', 'g'), ' ').replace(/^\x20|\x20$/, '').split(' ');
    obj[s + 'Operator'] = document.querySelector('input[name="' + s + 'Or"]').checked ? 'or' : 'and';
  }
  var publishyears = {};
  for (let s of ['from', 'until']) {
    let sel = document.querySelector('input[name="year' + s + '"]');
    let i = parseInt(sel.value, 10);
    publishyears[s] = isNaN(i) ? (sel.value = '') : i;
  }
  if (obj['keywords'][0] || obj['titles'][0] || obj['authors'][0] || obj['publishers'][0] || publishyears['from'] || publishyears['until']) {
    let q = 'select ';
    let concat = false;
    {
      let op = '';
      for (let i = 0; i < select.length; i++) {
        q += op + '[' + select[i] + ']';
        if (!op) {op = ',';}
      }
    }
    q += ' where';
    if (obj['keywords'][0]) {
      if (concat) {q += 'and';}
      concat = true;
      let op = '';
      q += '(';
      for (let keyword of obj['keywords']) {
        q += op + '([' + select[titleIndices[0]] + '] contains"' + keyword + '"or ' +
                   '[' + select[titleIndices[1]] + '] contains"' + keyword + '"or ' +
                   '[' + select[authorIndices[0]] + '] contains"' + keyword + '"or ' + 
                   '[' + select[authorIndices[1]] + '] contains"' + toKatakana(keyword) + '"or ' +
                   '[' + select[publisherIndex] + '] contains"' + keyword + '")';
        if (!op) {op = obj['keywordOperator'];}
      }
      q += ')';
    }
    if (obj['titles'][0]) {
      if (concat) {q += 'and';}
      concat = true;
      let op = '';
      q += '(';
      for (let title of obj['titles']) {
        q += op + '([' + select[titleIndices[0]] + '] contains"' + title + '"or ' +
                   '[' + select[titleIndices[1]] + '] contains"' + title + '")';
        if (!op) {op = obj['titleOperator'];}
      }
      q += ')';
    }
    if (obj['authors'][0]) {
      if (concat) {q += 'and';}
      concat = true;
      let op = '';
      q += '(';
      for (let author of obj['authors']) {
        q += op + '([' + select[authorIndices[0]] + '] contains"' + author + '"or ' +
                   '[' + select[authorIndices[1]] + '] contains"' + toKatakana(author) + '")';
        if (!op) {op = obj['authorOperator'];}
      }
      q += ')';
    }
    if (obj['publishers'][0]) {
      if (concat) {q += 'and';}
      concat = true;
      let op = '';
      q += '(';
      for (let publisher of obj['publishers']) {
        q += op + '[' + select[publisherIndex] + '] contains"' + publisher + '"';
        if (!op) {op = obj['publisherOperator'];}
      }
      q += ')';
    }
    if (publishyears['from'] || publishyears['until']) {
      if (concat) {q += 'and';}
      concat = true;
      q += '(';
      if (publishyears['from']) {
        q += '[' + select[publishyearIndex] + ']>=' + publishyears['from'];
        if (publishyears['until']) {
          q += ' and ';
        }
      }
      if (publishyears['until']) {
        q += '[' + select[publishyearIndex] + ']<=' + publishyears['until']; }
      q += ')';
    }

    // rewrite due to a bug of Google Visualization API
    for (let r of select) {
      q = q.replace(new RegExp('\\[' + r + '\\]', "g"), selectA1[r]);
    }

    // remove keyboard (iPhone)
    document.activeElement.blur();
    //
    setResultsSize();

    const script = document.createElement('script');
    script.src = 'https://docs.google.com/spreadsheets/d/1-XgySBso-vJoqMhmYgUZMtjcCY0qnjm-vIr3c6J7_M8/gviz/tq?tqx=out:json;responseHandler:callback&headers=1&sheet=%22' + sheetname + '%22&tq=' + encodeURIComponent(q);
    document.getElementsByTagName('head')[0].appendChild(script);
    // callback function dataHandler() is called.
  } else {
    document.getElementById('results').innerHTML = '';
  }
  event.preventDefault();
}

var callback = (json) => {
  var data = new google.visualization.DataTable(json['table']);
  var view = new google.visualization.DataView(data);
  view.hideColumns([yomiIndex, NDLBibIDIndex]);
  var table = new google.visualization.Table(document.getElementById('results'));
  table.draw(view, {width: '100%'});
  google.visualization.events.addListener(table, 'select', () => {
    var selection = table.getSelection();
    if (selection.length > 0) {
      var row = table.getSelection()[0].row;
      var id = data.getValue(row, NDLBibIDIndex);
      if (id.match(/^[0-9]+$/)) {
        var win = window.open('https://id.ndl.go.jp/bib/' + id);
        // take care of iPhone's spinning indicator
        var timer = setInterval(() => {
          if (!win || win.closed) {
            clearInterval(timer);
          }
        }, 1000);
      }
    }
    table.setSelection([]);
  });
}
