const ro = new ResizeObserver((entries) => {
  setIframeSize();
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

function setIframeSize() {
  var rectangleWithOutMargin = document.getElementById('wrapper');
  var iframeWrapper = document.getElementById('iframe-wrapper');
  var rect = iframeWrapper.getBoundingClientRect();
  var iframe = document.getElementById('results');
  if (rect.left == 0) { /* portlait */
    iframe.style.height = (rectangleWithOutMargin.getBoundingClientRect().height - rect.top) + "px";
    iframe.style.width = rectangleWithOutMargin.getBoundingClientRect().width + "px";
  } else { /* landscape */
    iframe.style.height = rectangleWithOutMargin.getBoundingClientRect().height + "px";
    iframe.style.width = (rectangleWithOutMargin.getBoundingClientRect().width - 280) + "px";
  }
}

function toKatakana(s) {
  return s.replace(/[ぁ-ゖ]/g, (s) => {return String.fromCharCode(s.charCodeAt(0) + 0x60);});
}

function sendQuery(event) {
  // change here! if column or sheet names are modified in the sheet
  const selectA1 = {'著者・編者':'B', '読み':'C', 'シリーズ名':'D', '巻号':'E', 'タイトル':'F', '出版者':'G', '出版年':'H', '分類記号':'I', '配架場所':'L'};
  const yomiIndex = 1;
  const authorIndices = [0, yomiIndex];
  const titleIndices = [2, 4];
  const publisherIndex = 5;
  const publishyearIndex = 6;
  const sheetname = 'Sheet1';
  //
  var select = Object.keys(selectA1);
  var obj = {};
  for (let s of ['keyword', 'title', 'author', 'publisher']) {
    obj[s + 's'] = document.querySelector('input[name="' + s +'"]').value.replace(/[,\."'`=\[\]/∙∙／・　＝、。，]/g, ' ').split(' ');
    obj[s + 'Operator'] = document.querySelector('input[name="' + s + 'Or"]').checked ? 'or' : 'and';
  }
  var publishyears = {};
  for (let s of ['from', 'until']) {
    let sel = document.querySelector('input[name="year' + s + '"]');
    let i = parseInt(sel.value, 10);
    publishyears[s] = isNaN(i) ? (sel.value = '') : i;
  }
  if (obj['keywords'][0] || obj['authors'][0] || obj['publishers'][0] || obj['titles'][0] || publishyears['from'] || publishyears['until']) {
    let q = 'select ';
    let concat = false;
    {
      let op = '';
      for (let i = 0; i < select.length; i++) {
        if (i != yomiIndex) {
          q += op + '[' + select[i] + ']';
          if (!op) {op = ',';}
        }
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
      for (let publisher of publishers) {
        q += op + '[' + select[publisherIndex] + '] contains"' + publisher + '"';
        if (!op) {op = obj['publisherOperator'];}
      }
      q += ')';
    }
    if (publishyears['from'] || publishyears['until']) {
      if (concat) {q += 'and';}
      concat = true;
      q += '([' + select[publishyearIndex] + '] is not null and ';
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
    setIframeSize();
    document.getElementById('results').src = 'https://docs.google.com/spreadsheets/d/1-XgySBso-vJoqMhmYgUZMtjcCY0qnjm-vIr3c6J7_M8/gviz/tq?headers=1&sheet=%22' + sheetname + '%22&tqx=out:html&tq=' + encodeURIComponent(q);
  } else {
    document.getElementById('results').src = 'about:blank';
  }
  event.preventDefault();
}
