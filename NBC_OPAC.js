// change here! if column or sheet names are modified in the sheet
const selectA1 = {'著者・編者':'B', '読み':'C', 'シリーズ名':'D', '巻号':'E', 'タイトル':'F', '出版者':'H', '出版年':'J', '分類記号':'K', '配架場所':'M', 'NDL書誌ID':'L', '出版者備考':'I', 'タイトル備考':'G'};
const yomiIndex = 1;
const authorIndices = [0, yomiIndex];
const title2Index = 11;
const titleIndices = [2, 4, title2Index];
const publisher2Index = 10;
const publisherIndices = [5, publisher2Index];
const publishyearIndex = 6;
const NDLBibIDIndex = 9;
const sheetname = 'Sheet1';
//
var select = Object.keys(selectA1);
var querySelect = [];
var hiddenIndex = -1;
for (let i = 0; i < select.length; i++) {
  if (i === NDLBibIDIndex) {
    hiddenIndex = querySelect.length;
  }
  if (i !== yomiIndex && i !== title2Index && i !== publisher2Index) {
    querySelect.push(select[i]);
  }
}

function toKatakana(s) {
  return s.replace(/[ぁ-ゖ]/g, (s) => {return String.fromCharCode(s.charCodeAt(0) + 0x60);});
}

async function sendQuery(event) {
  var obj = {};
  for (let s of ['keyword', 'title', 'author', 'publisher']) {
    obj[s + 's'] = document.querySelector('input[name="' + s +'"]').value.replace(/[\s\u3000"]+/g, ' ').replace(/^\s*|\s*$/g, '').split(' ');
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
      for (let s of querySelect) {
        q += op + '[' + s + ']';
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
        q += op + '(';
        {
          let op = '';
          for (let titleIndex of titleIndices) {
            q += op + '[' + select[titleIndex] + '] contains"' + keyword + '"';
            if (!op) {op = 'or ';}
          }
          for (let authorIndex of authorIndices) {
            q += op + '[' + select[authorIndex] + '] contains"' + keyword + '"'; 
          }
          for (let publisherIndex of publisherIndices) {
            q += op + '[' + select[publisherIndex] + '] contains"' + keyword + '"';
          }
        }
        q += ')';
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
        q += op + '(';
        {
          let op = '';
          for (let titleIndex of titleIndices) {
            q += op + '[' + select[titleIndex] + '] contains"' + title + '"';
            if (!op) {op = 'or ';}
          }
        }
        q += ')';
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
        q += op + '(';
        {
          let op = '';
          for (let authorIndex of authorIndices) {
            if (authorIndex === yomiIndex) {
              author = toKatakana(author);
            }
            q += op + '[' + select[authorIndex] + '] contains"' + author + '"';
            if (!op) {op = 'or ';}
          }
        }
        q += ')';
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
        q += op + '(';
        {
          let op = '';
          for (let publisherIndex of publisherIndices) {
            q += op + '[' + select[publisherIndex] + '] contains"' + publisher + '"';
            if (!op) {op = 'or ';}
          }
        }
        q += ')';
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

    const script = document.createElement('script');
    script.src = 'https://docs.google.com/spreadsheets/d/1-XgySBso-vJoqMhmYgUZMtjcCY0qnjm-vIr3c6J7_M8/gviz/tq?tqx=out:json;responseHandler:callback&headers=1&sheet=%22' + sheetname + '%22&tq=' + encodeURIComponent(q);
    document.head.appendChild(script);
    // callback function dataHandler() is called.
  } else {
    document.getElementById('results').innerHTML = '';
  }
  event.preventDefault();
}

var callback = (json) => {
  var data = new google.visualization.DataTable(json['table']);
  var view = new google.visualization.DataView(data);
  view.hideColumns([hiddenIndex]);
  var table = new google.visualization.Table(document.getElementById('results'));
  table.draw(view, { width: '100%' });
  google.visualization.events.addListener(table, 'select', () => {
    var selection = table.getSelection();
    if (selection.length > 0) {
      var row = table.getSelection()[0].row;
      table.setSelection([]);
      var id = data.getValue(row, hiddenIndex);
      if (id.match(/^[0-9]+$/)) {
        var a = document.createElement('a');
        a.href = 'https://id.ndl.go.jp/bib/' + id;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.click();
        a.remove();
      }
    }
  });
}
